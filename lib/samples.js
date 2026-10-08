export const samples = [
  {
    id: 'registry', title: 'Registry access denied', platform: 'GitLab CI', tag: 'Access',
    pipelineType: 'gitlab', runnerLocation: 'on-premises', deploymentTarget: 'kubernetes',
    logText: 'Running with gitlab-runner 18.0.0\nPreparing the docker executor\nUsing Docker executor with image node:22\nGetting source from Git repository\nChecking out 4d7e9a1 as detached HEAD (ref is main)\n$ npm ci\nadded 214 packages in 6s\n$ npm run build\nBuild completed successfully\n$ docker build -t registry.example.com/team/api:4d7e9a1 .\nSuccessfully built 81e2a4c\n$ docker push registry.example.com/team/api:4d7e9a1\nThe push refers to repository [registry.example.com/team/api]\ndenied: requested access to the resource is denied\nERROR: Job failed: exit code 1',
    configText: 'build:\n  stage: build\n  script:\n    - npm ci\n    - npm run build\n    - docker build -t registry.example.com/team/api:$CI_COMMIT_SHA .\n    - docker push registry.example.com/team/api:$CI_COMMIT_SHA',
  },
  {
    id: 'syntax', title: 'Invalid pipeline configuration', platform: 'GitLab CI', tag: 'Configuration',
    pipelineType: 'gitlab', runnerLocation: 'on-premises', deploymentTarget: 'unknown',
    logText: 'Validating .gitlab-ci.yml\nPipeline cannot be run\njobs:build:script config should be a string or a nested array of strings up to 10 levels deep\nyaml invalid',
    configText: 'build:\n  script:\n    - echo status: building',
  },
  {
    id: 'runtime', title: 'Missing build runtime', platform: 'Jenkins', tag: 'Environment',
    pipelineType: 'jenkins', runnerLocation: 'on-premises', deploymentTarget: 'on-premises',
    logText: 'Started by user developer\n[Pipeline] node\nRunning on linux-agent-02 in /workspace/api\n[Pipeline] stage\n[Pipeline] { (Install dependencies)\n[Pipeline] sh\n+ npm ci\n/workspace/api@tmp/durable-a1/script.sh: 1: npm: not found\nscript returned exit code 127\nFinished: FAILURE',
    configText: "pipeline {\n  agent { label 'linux' }\n  stages {\n    stage('Install dependencies') {\n      steps { sh 'npm ci' }\n    }\n  }\n}",
  },
  {
    id: 'tls', title: 'Internal certificate not trusted', platform: 'Jenkins', tag: 'Network',
    pipelineType: 'jenkins', runnerLocation: 'on-premises', deploymentTarget: 'on-premises',
    logText: '[Pipeline] stage (Checkout)\n+ git fetch origin main\nfatal: unable to access https://git.internal.example/team/api.git/: SSL certificate problem: self-signed certificate in certificate chain\nERROR: Error fetching remote repo origin\nFinished: FAILURE', configText: '',
  },
  {
    id: 'oidc', title: 'Cloud role assumption rejected', platform: 'GitHub Actions', tag: 'Cloud identity',
    pipelineType: 'github', runnerLocation: 'cloud-hosted', deploymentTarget: 'cloud',
    logText: 'Run aws-actions/configure-aws-credentials\nRequesting OIDC token\nOIDC token received\nAssuming role with OIDC\nError: Could not assume role with OIDC: Not authorized to perform sts:AssumeRoleWithWebIdentity',
    configText: 'permissions:\n  contents: read\n  id-token: write\njobs:\n  deploy:\n    environment: production\n    runs-on: ubuntu-latest\n    steps:\n      - uses: aws-actions/configure-aws-credentials@v4\n        with:\n          role-to-assume: arn:aws:iam::123456789012:role/deploy\n          aws-region: ap-southeast-1',
  },
  {
    id: 'timeout', title: 'A timeout without enough context', platform: 'GitLab CI', tag: 'Needs evidence',
    pipelineType: 'gitlab', runnerLocation: 'cloud-hosted', deploymentTarget: 'on-premises',
    logText: 'Running integration tests\nConnecting to api.internal.example:443\nError: connect ETIMEDOUT 10.0.0.8:443\nRequest failed after 30000ms\nERROR: Job failed: exit code 1', configText: '',
  },
];
