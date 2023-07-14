import json
import boto3
import os

from boto3.session import Session


def handler(event, context):
    print('Loading function')

    code_pipeline = boto3.client('codepipeline')

    pipeline_name = os.environ['CODEPIPELINE_NAME']

    response = code_pipeline.list_pipeline_executions(
        pipelineName=pipeline_name,
        maxResults=1
    )

    print(response['pipelineExecutionSummaries'])

    if len(response['pipelineExecutionSummaries']) > 0 and response['pipelineExecutionSummaries'][0]['status'] == 'InProgress':

        print(response['pipelineExecutionSummaries'][0]['pipelineExecutionId'])
        
        pipeline_state = code_pipeline.get_pipeline_state(name=pipeline_name)
        
        approval_stage = pipeline_state['stageStates'][3]['actionStates'][0]
        
        if pipeline_state['stageStates'][3]['stageName'] == 'ManualApproval' and approval_stage['latestExecution']['status'] == 'InProgress':
            print('Pipeline waiting at ManualApproval Stage, sending a reject signal')
            approval_res = code_pipeline.put_approval_result(pipelineName=pipeline_name,
                                                stageName='ManualApproval',
                                                actionName=approval_stage['actionName'],
                                                result={
                                                    'summary': 'CW Alarm triggered, so sending a Reject signal',
                                                    'status': 'Rejected'
                                                },
                                                token=approval_stage['latestExecution']['token'])
            print(approval_res)
            
        else:
            print('Pipeline is not in ManualApproval stage, so sending a stop signal')
            res = code_pipeline.stop_pipeline_execution(pipelineName=pipeline_name,
                                                    pipelineExecutionId=response['pipelineExecutionSummaries'][
                                                        0]['pipelineExecutionId'],
                                                    abandon=True,
                                                    reason='Alarm triggered, stopping the Canary deployment.')

            print(res)

        print('Restoring the Canary ECS Service to previous revision.')
        ecs_canary_svc_arn = os.environ['ECS_CANARY_SVC_ARN']
        ecs_svc_arn = os.environ['ECS_SVC_ARN']
        ecs_cluster = os.environ['ECS_CLUSTER']
        ecs_client = boto3.client("ecs")
        svc_response = ecs_client.describe_services(
            cluster=ecs_cluster, services=[ecs_svc_arn])
        print(svc_response)
        update_svc_response = ecs_client.update_service(
            cluster=ecs_cluster,
            service=ecs_canary_svc_arn,
            taskDefinition=svc_response['services'][0]['taskDefinition'],
            forceNewDeployment=True
        )
        print(update_svc_response)

    else:
        print('CodePipeline execution status is not InProgress, nothing to do!')

    return {
        'statusCode': 200,
        'body': json.dumps('Function completed!')
    }
