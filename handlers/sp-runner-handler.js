import AWS from 'aws-sdk'
import axios from 'axios'
import helper from '../lib/helper'

const sqs = new AWS.SQS({region: 'ap-northeast-1'})
const ssm = new AWS.SSM({ apiVersion: '2014-11-06' })


export const main = (event, context, callback) => {

  const { client : clientInfo, jobs } = event.detail

  var AWS_ACCOUNT = context.invokedFunctionArn.split(":")[4]
  var QUEUE_URL = `https://sqs.ap-northeast-1.amazonaws.com/${AWS_ACCOUNT}/MyQueue`

  console.log(clientInfo)

// get the data here from MPP SP
  const accessToken = mppSQLAuthenticate(clientInfo)

  mppSQLAxios.interceptors.request.use(async (opts) => {
    opts.headers.common['Authorization'] = `Bearer ${accessToken}`
    return opts
  }, function (error) {
    return Promise.reject(error)
  })

  async function runMPPQuery(jobs){
    await Promise.all(jobs.map(async (job) => {
      const { data } = await mppSQLAxios.post('/queries', {
        query: job.query,
        options: {
          type: 'SELECT'
        }
      })

      const params = {
        MessageBody: JSON.stringify(data),
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
          callback(null, response)
        } else {
          console.log('data:', data)
          const response = {
            statusCode: 200,
            body: JSON.stringify({
              messageId: data.MesssageId,
              message: data
            })
          };
          callback(null, response)
        }
      });
    }))
  }

  const test = runMPPQuery(jobs)

}

export const mppSQLAxiosPublic = axios.create({
  baseURL: process.env.MSA_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

async function mppSQLAuthenticate(client) {
  const { ID , secret } = client
  const { Parameter: { Value: msaClientId } } = await helper.get_ssm_param(ID)
  const { Parameter: { Value: msaClientSecret } } =  await helper.get_ssm_param(secret)
  const { data: { accessToken } } = await mppSQLAxiosPublic.post('/authentication', {
    strategy: 'local',
    clientId: msaClientId,
    clientSecret: msaClientSecret
  })
  return accessToken
}

export const mppSQLAxios = axios.create({
  baseURL: process.env.MSA_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

export default main
