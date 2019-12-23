import axios from 'axios'
import helper from '../lib/helper'
var clientInfo = ''

export class SpRunnerHandler {

  constructor (event, context) {
    this._event = event
    this._context = context
  }

  async main(callback) {
    try {
      const { client , jobs } = this._event.detail
      clientInfo = client

      await Promise.all(jobs.map(async (job) => {
        const { data } = await mppSQLAxios.post('/queries', {
          query: job.query,
          /*options: {
            type: 'SELECT'
          }*/
        })

        const jobData = {
          data: { ...this._event.detail,  SPResults : data}
        }
        if (Boolean(data) && data.length) {
          console.log('SP Results Length: ', data.length)

          await helper.enqueue_sp_results(jobData)
        }
      }))
      callback(null, 'Success')
    }catch (error) {
      console.error(error)
      callback(error)
    }
  }

}

export const mppSQLAxiosPublic = axios.create({
  baseURL: process.env.MSA_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

async function mppSQLAuthenticate (client) {
  const { ID, secret } = client
  const { Parameter: { Value: msaClientId } } = await helper.get_ssm_param(ID)
  const { Parameter: { Value: msaClientSecret } } = await helper.get_ssm_param(secret)
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

mppSQLAxios.interceptors.request.use(async (opts) => {
  const accessToken = await mppSQLAuthenticate(clientInfo)
  opts.headers.common['Authorization'] = 'Bearer ' + accessToken
  return opts
}, function (error) {
  return Promise.reject(error)
})

export const main = async (event, context, callback) => {
  const handler = new SpRunnerHandler(event, context)
  await handler.main(callback)
}
