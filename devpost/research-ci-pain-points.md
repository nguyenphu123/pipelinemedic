# PipelineMedic: CI/CD pain-point research

Research date: September 24, 2026. Research recommendations, not approved scope.

## Evidence boundary
This taxonomy synthesizes vendor troubleshooting documentation and testing literature. It is not exhaustive or a statistical ranking of prevalence. Suggested priority means suitability for our proof of concept.

Record CI platform, runner hosting, and deployment target separately. A cloud control plane can dispatch to an on-premises runner; on-premises Jenkins can deploy to cloud infrastructure.

## Failure taxonomy
| Category | Symptoms | Useful context |
|---|---|---|
| Configuration | Invalid syntax, skipped jobs, incorrect ordering | Definition, includes, branch and trigger |
| Build/dependencies | Compiler errors, incompatible runtime, unresolved package | Lockfile, runtime and build configuration |
| Environment | Works locally, missing executable, path/permission issue | Runner image, OS, shell, user |
| Identity/access | Registry denied, expired credential, role denied | Non-secret identity and policy metadata |
| Network/TLS | DNS failure, timeout, certificate failure | Network path, proxy, CA and endpoint |
| Runner/resources | Queued job, agent loss, disk exhaustion, killed process | Agent diagnostics and metrics |
| Cache/artifacts | Wrong cache, missing output, inconsistent dependency state | Keys, paths and upstream job result |
| Tests/concurrency | Intermittent test, timing race, file contention | Multiple runs, reports, fixtures |
| Containers | Daemon unavailable, image pull failure, throttling | Image reference and registry response |
| Deployment | Rollout timeout, container startup failure | Target events, logs and readiness state |
| External limits | Billing block, rate limits, service outage | Account limits and incident-time status |
| Operational friction | Slow feedback, noisy logs, repeated investigation | Timings, history and ownership |

## Recommended first scope
Target developers and DevOps engineers using Jenkins or GitLab CI who need internal deployment and model choice. Accept log text, optional pipeline configuration and environment metadata. Return evidence-linked likely causes, alternatives, missing evidence, suggested repairs and verification steps. Expose the same service through the web UI and MCP.

Prioritize configuration, environment/dependency, registry/access and network/TLS cases. Include a cloud identity fixture. A timeout alone cannot identify a firewall rule; one failure cannot establish test flakiness; an exit code alone cannot establish OOM. Distinguish primary failures from downstream symptoms.

Later: last-success comparison, read-only CI connectors, repeated-failure history and runner telemetry. Persistence is optional until history is in scope; SQLite suits a single-instance prototype. PostgreSQL can be evaluated for concurrent multi-instance use.

## Differentiation
GitHub and GitLab already document AI failure explanations. Proposed differentiation is Jenkins/GitLab support, internal deployment, cloud/local model choice, and evidence with explicit uncertainty. This is a product hypothesis, not validated market demand.

## Evaluation proposal
Create labeled synthetic or sanitized fixtures with known causes: GitLab configuration failure, Jenkins runtime/path mismatch, registry denial, TLS trust failure, cloud OIDC mismatch, and ambiguous timeout. Check evidence accuracy, unsupported claims, verification usefulness and secret handling. Synthetic cases do not establish production cloud validation.

## Sources
- [GitLab debugging](https://docs.gitlab.com/ci/debugging/)
- [GitLab runners](https://docs.gitlab.com/runner/faq/)
- [GitLab caching](https://docs.gitlab.com/ci/caching/)
- [GitHub troubleshooting and AI assistance](https://docs.github.com/en/actions/how-tos/troubleshoot-workflows)
- [GitHub workflow logs](https://docs.github.com/en/actions/how-tos/monitor-workflows/use-workflow-run-logs)
- [GitHub self-hosted runners](https://docs.github.com/en/actions/how-tos/manage-runners/self-hosted-runners/monitor-and-troubleshoot)
- [GitHub OIDC](https://docs.github.com/en/actions/reference/security/oidc)
- [AWS CodeBuild troubleshooting](https://docs.aws.amazon.com/codebuild/latest/userguide/troubleshooting.html)
- [AWS CodeBuild VPC troubleshooting](https://docs.aws.amazon.com/codebuild/latest/userguide/troubleshooting-vpc.html)
- [Azure Pipelines troubleshooting](https://learn.microsoft.com/en-us/azure/devops/pipelines/troubleshooting/troubleshooting?view=azure-devops)
- [Jenkins scaling](https://www.jenkins.io/doc/book/pipeline/scaling-pipeline/)
- [Kubernetes deployments](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/)
- [Kubernetes images](https://kubernetes.io/docs/concepts/containers/images/)
- [Non-deterministic tests](https://martinfowler.com/articles/nonDeterminism.html)
