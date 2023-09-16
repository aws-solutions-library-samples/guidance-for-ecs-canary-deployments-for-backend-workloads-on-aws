#!/usr/bin/env bash

######################################################################
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved. #
# SPDX-License-Identifier: MIT-0                                     #
######################################################################

echo -e "Start cleanup..."

export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
export AWS_DEFAULT_REGION=$(aws configure get region)

export CODE_REPO_NAME=$(aws cloudformation describe-stacks --stack-name CanaryContainerImageStack --query 'Stacks[*].Outputs[?ExportName==`repoName`].OutputValue' --output text)
export API_NAME="sample-app"
export CIDR_RANGE="10.0.0.0/16"
export CODE_REPO_URL=$(aws cloudformation describe-stacks --stack-name CanaryContainerImageStack --query 'Stacks[*].Outputs[?ExportName==`repoCloneUrlHttp`].OutputValue' --output text)
export ECR_REPO_NAME=$(aws cloudformation describe-stacks --stack-name CanaryContainerImageStack --query 'Stacks[*].Outputs[?ExportName==`ecsCanaryEcrRepoName`].OutputValue' --output text)
export CODE_BUILD_PROJECT_NAME=$(aws cloudformation describe-stacks --stack-name CanaryContainerImageStack --query 'Stacks[*].Outputs[?ExportName==`canaryCodeBuildProjectName`].OutputValue' --output text)
export ECS_TASK_ROLE_ARN=$(aws cloudformation describe-stacks --stack-name CanaryContainerImageStack --query 'Stacks[*].Outputs[?ExportName==`ecsCanaryTaskRoleArn`].OutputValue' --output text)
export ECS_TASK_EXEC_ROLE_ARN=$(aws cloudformation describe-stacks --stack-name CanaryContainerImageStack --query 'Stacks[*].Outputs[?ExportName==`ecsCanaryTaskExecRoleArn`].OutputValue' --output text)
export CUSTOM_LAMBDA_ROLE_ARN=$(aws cloudformation describe-stacks --stack-name CanaryContainerImageStack --query 'Stacks[*].Outputs[?ExportName==`customLambdaRoleArn`].OutputValue' --output text)


cdk --app "npx ts-node bin/pipeline-stack.ts" destroy --require-approval never
cdk --app "npx ts-node bin/image-stack.ts" destroy --require-approval never

echo -e "Cleanup completed..."