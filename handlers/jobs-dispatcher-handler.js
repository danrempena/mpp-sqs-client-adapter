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
        console.log('Messages length : ' + Messages.length)
        for(let i = 0, l = Messages.length; i < l; i++){
          // const { data } = mockData
          await helper.invoke_functions(Messages[i])

          console.log('Job release on Queue.')
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
