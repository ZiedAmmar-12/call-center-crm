using Backend.Data;
using Backend.Entities;
using Microsoft.EntityFrameworkCore;
using System.Data;
using System.Data.Common;

namespace Backend.Services.SourceFiles
{
    public class SourceFileImportWorker : BackgroundService
    {
        private static readonly TimeSpan PollDelay = TimeSpan.FromSeconds(5);

        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<SourceFileImportWorker> _logger;
        private readonly int _maxConcurrentImports;
        private readonly TimeSpan _heartbeatTimeout;

        public SourceFileImportWorker(
            IServiceScopeFactory scopeFactory,
            ILogger<SourceFileImportWorker> logger,
            IConfiguration configuration)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
            _maxConcurrentImports = Math.Clamp(
                configuration.GetValue<int?>("ImportWorker:MaxConcurrentImports") ?? 2,
                1,
                8);
            _heartbeatTimeout = TimeSpan.FromMinutes(Math.Clamp(
                configuration.GetValue<int?>("ImportWorker:HeartbeatTimeoutMinutes") ?? 10,
                2,
                120));
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation(
                "Starting source file import worker with {WorkerCount} consumer(s).",
                _maxConcurrentImports);

            var consumers = Enumerable.Range(1, _maxConcurrentImports)
                .Select(workerNumber => RunConsumerAsync(workerNumber, stoppingToken))
                .ToArray();

            await Task.WhenAll(consumers);
        }

        private async Task RunConsumerAsync(int workerNumber, CancellationToken stoppingToken)
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                int? jobId = null;
                var workerId = $"{Environment.MachineName}:{Environment.ProcessId}:{workerNumber}";

                try
                {
                    jobId = await TryClaimNextJobAsync(workerId, stoppingToken);

                    if (!jobId.HasValue)
                    {
                        await Task.Delay(PollDelay, stoppingToken);
                        continue;
                    }

                    _logger.LogInformation(
                        "Worker {WorkerId} claimed import job {JobId}.",
                        workerId,
                        jobId.Value);

                    using var processingScope = _scopeFactory.CreateScope();
                    var sourceFileService = processingScope.ServiceProvider.GetRequiredService<ISourceFileService>();
                    await sourceFileService.ProcessImportJobAsync(jobId.Value, stoppingToken);
                }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                {
                    break;
                }
                catch (Exception ex)
                {
                    _logger.LogError(
                        ex,
                        "Source file import worker {WorkerNumber} failed while processing job {JobId}.",
                        workerNumber,
                        jobId);
                }
            }
        }

        private async Task<int?> TryClaimNextJobAsync(string workerId, CancellationToken cancellationToken)
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var now = DateTime.UtcNow;
            var staleBefore = now.Subtract(_heartbeatTimeout);

            await FailExpiredJobsThatReachedMaxAttemptsAsync(db, staleBefore, cancellationToken);

            await using var connection = db.Database.GetDbConnection();
            if (connection.State != ConnectionState.Open)
                await connection.OpenAsync(cancellationToken);

            using var command = connection.CreateCommand();
            command.CommandText = """
                WITH next_job AS (
                    SELECT id
                    FROM import_jobs
                    WHERE (
                            status = 0
                            OR (
                                status = 1
                                AND (
                                    (last_heartbeat_at IS NOT NULL AND last_heartbeat_at < @staleBefore)
                                    OR (last_heartbeat_at IS NULL AND started_at IS NOT NULL AND started_at < @staleBefore)
                                )
                            )
                        )
                        AND attempts < max_attempts
                    ORDER BY created_at
                    FOR UPDATE SKIP LOCKED
                    LIMIT 1
                )
                UPDATE import_jobs AS j
                SET status = 1,
                    started_at = @now,
                    last_heartbeat_at = @now,
                    worker_id = @workerId,
                    attempts = j.attempts + 1,
                    completed_at = NULL,
                    error_message = NULL
                FROM next_job
                WHERE j.id = next_job.id
                RETURNING j.id;
                """;
            AddParameter(command, "@now", now);
            AddParameter(command, "@staleBefore", staleBefore);
            AddParameter(command, "@workerId", workerId);

            var result = await command.ExecuteScalarAsync(cancellationToken);
            return result == null || result == DBNull.Value
                ? null
                : Convert.ToInt32(result);
        }

        private static async Task FailExpiredJobsThatReachedMaxAttemptsAsync(
            ApplicationDbContext db,
            DateTime staleBefore,
            CancellationToken cancellationToken)
        {
            await db.ImportJobs
                .Where(j => j.Status == ImportJobStatus.Processing &&
                            j.Attempts >= j.MaxAttempts &&
                            (
                                (j.LastHeartbeatAt != null && j.LastHeartbeatAt < staleBefore) ||
                                (j.LastHeartbeatAt == null && j.StartedAt != null && j.StartedAt < staleBefore)
                            ))
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(j => j.Status, ImportJobStatus.Failed)
                    .SetProperty(j => j.CompletedAt, DateTime.UtcNow)
                    .SetProperty(j => j.ErrorMessage, "Import worker lost heartbeat and max retry attempts were reached."),
                    cancellationToken);
        }

        private static void AddParameter(DbCommand command, string name, object value)
        {
            var parameter = command.CreateParameter();
            parameter.ParameterName = name;
            parameter.Value = value;
            command.Parameters.Add(parameter);
        }
    }
}
