import helper from '../lib/helper'
import mockData from '../mocks/events/queue-data-event'

export class JobsDispatcherHandler {

  constructor (event, context) {
    this._event = event
    this._context = context
  }

  async main(callback) {
    try{
      const { Attributes } = await helper.available_message_count()
      const { data } = mockData

      var queue_counts = parseInt(Attributes.ApproximateNumberOfMessages)

      if(queue_counts > 0){
        // const { data } = JSON.parse(await this.getResultsOnQueue())
        const fncName = data.job.function
        const test = await helper.invoke_functions(data, fncName)
        console.log(test)

      }else{
        console.log('No Available Message!')
      }

      callback(null, 'Success')
    }catch (error) {
      console.error(error)
      callback(error)
    }
  }

  async getResultsOnQueue() {
    const { Messages } = await helper.dispatch_sp_results()
    return Messages.map((message) => {
      if (message.Body) {
        return message.Body
      }
      return null
    })
  }
}

export const main = async (event, context, callback) => {
  const handler = new JobsDispatcherHandler(event, context)
  await handler.main(callback)
}
