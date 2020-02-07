import AWS from 'aws-sdk'
import jwtDecode from 'jwt-decode'

const ssm = new AWS.SSM({apiVersion: '2014-11-06'});
const sqs = new AWS.SQS({apiVersion: '2012-11-05'});
const lambda = new AWS.Lambda({apiVersion: '2015-03-31'})

const helper = {}

helper.get_ssm_param = (params) => {
  if (typeof params === 'string') {
    params = {
      Name: params
    }
  }
  params = {
    ...params,
    ...{
      Name: params.Name
    }
  }
  return ssm.getParameter(params).promise()
}

helper.put_ssm_param = (params) => {
  params = {
    ...{
      Type: 'String',
      Overwrite: true
    }, ...params,
    ...{
      Name: params.Name
    }
  }
  return ssm.putParameter(params).promise()
}

helper.enqueue_sp_results = (jobData) => {
  const params = {
    QueueUrl: process.env.SP_JOBS_QUEUE_URL,
    DelaySeconds: 30,
    MessageBody: JSON.stringify(jobData)
  }
  return sqs.sendMessage(params).promise()
}

helper.dispatch_sp_results = () => {
  const params = {
    MaxNumberOfMessages: 10,
    MessageAttributeNames: [
      'All'
    ],
    QueueUrl: process.env.SP_JOBS_QUEUE_URL,
    WaitTimeSeconds: 20
  }
  return sqs.receiveMessage(params).promise()
}

helper.available_message_count = () => {
  const params = {
    QueueUrl: process.env.SP_JOBS_QUEUE_URL,
    AttributeNames: [
      'ApproximateNumberOfMessages'
    ]
  }
  return sqs.getQueueAttributes(params).promise()
}

helper.invoke_functions = (message) => {
  const { data } = JSON.parse(message.Body)
  const fncName = data.job.function
  console.log(fncName)
  const params = {
    FunctionName: fncName,
    InvokeArgs: JSON.stringify(message)
  }
  return lambda.invokeAsync(params).promise()
}

helper.release_failed_job = (handle) => {
  const params = {
    QueueUrl: process.env.SQS_FAILED_QUEUE_URL,
    ReceiptHandle: handle,
    VisibilityTimeout: 30
  }
  return sqs.changeMessageVisibility(params).promise()
}

helper.check_jwt_exp = (jwt) => {
  const decoded = jwtDecode(jwt)
  const current = Math.round(+new Date() / 1000)
  return (!decoded.hasOwnProperty('exp') || !decoded.exp) || (decoded.hasOwnProperty('exp') && decoded.exp > current)
}

export default helper
