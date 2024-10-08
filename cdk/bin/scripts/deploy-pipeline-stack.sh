#!/usr/bin/env bash

######################################################################
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved. #
# SPDX-License-Identifier: MIT-0                                     #
######################################################################

#############################################################################
# CodePipeline resources
##############################################################################

Help() {
    echo 'Usage : deploy-pipeline-stack.sh <image stack name> <aws region>'
    exit
}

while getopts ":h" option; do
   case $option in
      h)
         Help
         exit;;
   esac
done

echo -e "Exporting the cloudformation stack outputs...."

export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
export CANARY_IMAGE_STACK="${1:-CanaryContainerImageStack}"
export AWS_DEFAULT_REGION="${2:-$(aws configure get region)}"

export CODE_REPO_NAME=$(aws cloudformation describe-stacks --stack-name $CANARY_IMAGE_STACK --query 'Stacks[*].Outputs[?ExportName==`repoName`].OutputValue' --output text)
export CODE_REPO_URL=$(aws cloudformation describe-stacks --stack-name $CANARY_IMAGE_STACK --query 'Stacks[*].Outputs[?ExportName==`repoCloneUrlHttp`].OutputValue' --output text)
export ECR_REPO_NAME=$(aws cloudformation describe-stacks --stack-name $CANARY_IMAGE_STACK --query 'Stacks[*].Outputs[?ExportName==`ecsCanaryEcrRepoName`].OutputValue' --output text)
export CODE_BUILD_PROJECT_NAME=$(aws cloudformation describe-stacks --stack-name $CANARY_IMAGE_STACK --query 'Stacks[*].Outputs[?ExportName==`canaryCodeBuildProjectName`].OutputValue' --output text)
export CODE_BUILD_ROLE_ARN=$(aws cloudformation describe-stacks --stack-name $CANARY_IMAGE_STACK --query 'Stacks[*].Outputs[?ExportName==`canaryCodeBuildProjectRoleArn`].OutputValue' --output text)
export ECS_TASK_ROLE_ARN=$(aws cloudformation describe-stacks --stack-name $CANARY_IMAGE_STACK --query 'Stacks[*].Outputs[?ExportName==`ecsCanaryTaskRoleArn`].OutputValue' --output text)
export ECS_TASK_EXEC_ROLE_ARN=$(aws cloudformation describe-stacks --stack-name $CANARY_IMAGE_STACK --query 'Stacks[*].Outputs[?ExportName==`ecsCanaryTaskExecRoleArn`].OutputValue' --output text)
export CUSTOM_LAMBDA_ROLE_ARN=$(aws cloudformation describe-stacks --stack-name $CANARY_IMAGE_STACK --query 'Stacks[*].Outputs[?ExportName==`customLambdaRoleArn`].OutputValue' --output text)

echo -e "Initiating the code build to create the container image...."
export BUILD_ID=$(aws codebuild start-build --project-name $CODE_BUILD_PROJECT_NAME --query build.id --output text)
BUILD_STATUS=$(aws codebuild batch-get-builds --ids $BUILD_ID --query 'builds[*].buildStatus' --output text | xargs)

# Wait till the CodeBuild status is SUCCEEDED
while [ "$BUILD_STATUS" != "SUCCEEDED" ];
do
  sleep 10
  BUILD_STATUS=$(aws codebuild batch-get-builds --ids $BUILD_ID --query 'builds[*].buildStatus' --output text | xargs)
  echo -e "Awaiting SUCCEEDED status....Current status: ${BUILD_STATUS}"
  if [ "$BUILD_STATUS" == "FAILED" ]
  then
    echo "CodeBuild is failed to complete, look at the logs to investigate further."
    exit 1;
  fi
done

echo -e "Completed CodeBuild...ECR image is available"

echo -e "Start building the CodePipeline resources...."

export API_NAME=sample-app
export CIDR_RANGE=10.0.0.0/16

cdk --app "npx ts-node bin/pipeline-stack.ts" deploy --require-approval never

echo -e "Completed building the CodePipeline resources...."
