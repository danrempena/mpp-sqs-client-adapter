import helper from '../lib/helper'
import AWS from "aws-sdk"

const lambda = new AWS.Lambda({apiVersion: '2015-03-31'})

export class JobsDispatcherHandler {

  constructor (event, context) {
    this._event = event
    this._context = context
  }

  async main(callback) {
    try{
      const { Messages : data } = await helper.dispatch_sp_results()
      // const queueMessages = await helper.dispatch_sp_results()

      console.log(data)
      callback(null, 'Success')
    }catch (error) {
      console.error(error)
      callback(error)
    }
  }
}

export const main = async (event, context, callback) => {
  const handler = new JobsDispatcherHandler(event, context)
  await handler.main(callback)
}
