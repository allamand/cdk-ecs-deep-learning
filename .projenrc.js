const { awscdk } = require('projen');
const project = new awscdk.AwsCdkTypeScriptApp({
  cdkVersion: '2.126.0',
  defaultReleaseBranch: 'main',
  name: 'cdk-ecs-deep-learning',

  // cdkDependencies: [
  //   '@aws-cdk/aws-certificatemanager',
  //   '@aws-cdk/aws-ec2',
  //   '@aws-cdk/aws-ecr',
  //   '@aws-cdk/aws-ecs',
  //   '@aws-cdk/aws-ecs-patterns',
  //   '@aws-cdk/aws-route53',
  //   '@aws-cdk/aws-ssm',
  //   '@aws-cdk/core',
  //   '@aws-cdk-containers/ecs-service-extensions',
  //   '@aws-cdk/aws-iam',
  //   '@aws-cdk/aws-elasticloadbalancingv2',
  //   '@aws-cdk/aws-servicediscovery',
  //   '@aws-cdk/aws-route53-targets',
  //   '@aws-cdk/aws-autoscaling',
  //   '@aws-cdk/aws-kms',
  //   '@aws-cdk/aws-logs',
  //   '@aws-cdk/aws-s3',
  // ],

  //cdkTestDependencies: ['@aws-cdk/assert'],

  dependabot: false,
  //projenUpgradeSecret: 'YARN_UPGRADE_TOKEN',
  //autoApproveUpgrades: true,
  autoApproveOptions: {
    secret: 'GITHUB_TOKEN',
    allowedUsernames: ['github-actions', 'github-actions[bot]', 'allamand'],
  },

  //releaseEveryCommit: true,
  //releaseToNpm: true,
  context: {},

  gitignore: ['cdk.out', 'cdk.context.json', '.env'],

  // cdkDependencies: undefined,  /* Which AWS CDK modules (those that start with "@aws-cdk/") this app uses. */
  // deps: [],                    /* Runtime dependencies of this module. */
  // description: undefined,      /* The description is just a string that helps people understand the purpose of the package. */
  // devDeps: [],                 /* Build dependencies for this module. */
  // packageName: undefined,      /* The "name" in package.json. */
  // release: undefined,          /* Add release management to this project. */
});
project.synth();
