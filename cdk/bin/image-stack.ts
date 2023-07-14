#!/usr/bin/env node

// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import 'source-map-support/register';
import { Construct } from 'constructs';
//import {CfnParameter, StackProps, Stack, App} from 'aws-cdk-lib';
import * as ecsRoles from '../lib/common/roles';
import * as ecsImage from '../lib/pipeline/build-image';
import cdk = require("aws-cdk-lib")

export class CanaryContainerImageStack extends cdk.Stack {

    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // Defining the CFN input parameters
        const codeRepoDesc = new cdk.CfnParameter(this, 'codeRepoDesc', {
            type: 'String',
            description: 'CodeCommit repository for the ECS Canary demo',
            default: 'Source code for the ECS Canary demo'
        });

        // Build the stack
        const ecsCanaryRoles = new ecsRoles.EcsCanaryRoles(this, 'EcsCanaryRoles');
        new ecsImage.EcsCanaryBuildImage(this, 'EcsCanaryBuildImage', {
            codeBuildRole: ecsCanaryRoles.codeBuildRole,
            ecsTaskExecRole: ecsCanaryRoles.ecsExecutionTaskRole,
            codeRepoName: process.env.CODE_REPO_NAME,
            codeRepoDesc: codeRepoDesc.valueAsString
        });
    }

}

const app = new cdk.App();
new CanaryContainerImageStack(app, 'CanaryContainerImageStack', {
    description: 'Builds the canary deployment container build stack'
});