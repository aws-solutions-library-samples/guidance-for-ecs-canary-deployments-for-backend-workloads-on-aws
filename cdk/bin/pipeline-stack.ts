#!/usr/bin/env node

// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import 'source-map-support/register';
import { Construct } from 'constructs';
import * as EcsCanary from '../lib/pipeline/build-pipeline';
import * as EcsCluster from '../lib/ecs/cluster';
import * as CanarySQS from '../lib/sqs/sqs-queue';
import * as CanaryLambda from '../lib/custom_resource/lambda';

import cdk = require("aws-cdk-lib")

export class CanaryPipelineStack extends cdk.Stack {

    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        //Build the dependent resources first

        const canaryQueue = new CanarySQS.SQSQueue(this, 'EcsCanarySQS', {
            ecsTaskRoleArn: process.env.ECS_TASK_ROLE_ARN
        });

        // Build the stack
        const ecsCanaryCluster = new EcsCluster.EcsCanaryCluster(this, 'EcsCanaryCluster', {
            cidr: process.env.CIDR_RANGE
        });

        const canaryPipeline = new EcsCanary.EcsCanaryPipeline(this, 'EcsCanaryPipeline', {
            apiName: process.env.API_NAME,
            cluster: ecsCanaryCluster.cluster,
            vpc: ecsCanaryCluster.vpc,
            ecrRepoName: process.env.ECR_REPO_NAME,
            codeBuildProjectName: process.env.CODE_BUILD_PROJECT_NAME,
            codeRepoName: process.env.CODE_REPO_NAME,
            ecsTaskRoleArn: process.env.ECS_TASK_ROLE_ARN,
            ecsTaskExecRoleArn: process.env.ECS_TASK_EXEC_ROLE_ARN,
            queueName: canaryQueue.queue.queueName
        })

        new CanaryLambda.Lambda(this, 'EcsCanaryLambda', {
            cwalarm: canaryQueue.cwalarm,
            codePipelineName: canaryPipeline.pipeline.pipelineName,
            ecsCluster: ecsCanaryCluster.cluster.clusterName,
            ecsSvcArn: canaryPipeline.ecsCanarySvc.ecsService.serviceArn,
            ecsCanarySvcArn: canaryPipeline.ecsCanarySvc.ecsCanaryService.serviceArn,
            customLambdaRoleArn: process.env.CUSTOM_LAMBDA_ROLE_ARN
        });
    }
}


const app = new cdk.App();
new CanaryPipelineStack(app, 'CanaryPipelineStack', {
    description: 'Builds the Canary deployment pipeline stack'
});