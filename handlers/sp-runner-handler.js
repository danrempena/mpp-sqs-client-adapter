import AWS from 'aws-sdk'
import axios from 'axios'

var sqs = new AWS.SQS({region: 'ap-northeast-1'})
var ssm = new AWS.SSM({ apiVersion: '2014-11-06' })

const mppSQLAxiosPublic = axios.create({
  baseURL: process.env.MSA_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

const mppSQLAuthenticate = async(client) => {
  const { Parameter: { Value: msaClientId } } = await ssm.getParameter(client.ID).promise()
  const { Parameter: { Value: msaClientSecret } } = await ssm.getParameter(client.secret).promise()
  const { data: { accessToken } } = await mppSQLAxiosPublic.post('/authentication', {
    strategy: 'local',
    clientId: msaClientId,
    clientSecret: msaClientSecret
  })
  return accessToken
}

const mppSQLAxios = axios.create({
  baseURL: process.env.MSA_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})


export const main = (event, context, callback) => {

  var AWS_ACCOUNT = context.invokedFunctionArn.split(":")[4]
  var QUEUE_URL = `https://sqs.ap-northeast-1.amazonaws.com/${AWS_ACCOUNT}/JobsQueue`

// get the data here from MPP SP

  const accessToken = mppSQLAuthenticate(event.detail)

  mppSQLAxios.interceptors.request.use(async (opts) => {
    opts.headers.common['Authorization'] = 'Bearer ' + accessToken
    return opts
  }, function (error) {
    return Promise.reject(error)
  })

// end

  const params = {
    MessageBody: JSON.stringify('test'),
    QueueUrl: QUEUE_URL
  }

  sqs.sendMessage(params, function(err, data) {
    if (err) {
      console.log('error:', 'Fail Send Message' + err);

      const response = {
        statusCode: 500,
        body: JSON.stringify({
          message: 'ERROR'
        })
      };

      callback(null, response);
    } else {
      console.log('data:', data);

      const response = {
        statusCode: 200,
        body: JSON.stringify({
          messageId: data.MesssageId,
          message: data
        })
      };

      callback(null, response);
    }
  });
};
