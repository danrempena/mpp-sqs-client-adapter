import helper from '../lib/helper'
import mockData from '../mocks/events/queue-data-event'

export class JobsDispatcherHandler {

  constructor (event, context) {
    this._event = event
    this._context = context
  }

  async main(callback) {
    try{
      const { Messages } = await helper.dispatch_sp_results()

      if(Boolean(Messages) && Messages.length){
        for(let i = 0, l = Messages.length; i < l; i++){
          const { data } = mockData
          const handle = Messages[i].ReceiptHandle
          // const { data } = JSON.parse(Messages[i].Body)
          const fncName = data.job.function
          const ClientApiResponse = await helper.invoke_functions(data, fncName)

          if(ClientApiResponse){
            const { success, fail } = ClientApiResponse.Payload
            console.log(success)
            // await helper.delete_success_job(handle)
          }
        }
      }else{
        console.log('No Available Message!')
      }
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
