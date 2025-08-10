import { ForkRegistered } from '../generated/ForkRegistry/ForkRegistry'
import { Fork } from '../generated/schema'

export function handleForkRegistered(event: ForkRegistered): void {
  const id = event.params.childTokenId.toString()
  let entity = new Fork(id)
  entity.parentTokenId = event.params.parentTokenId
  entity.childTokenId = event.params.childTokenId
  entity.caller = event.params.caller
  entity.save()
}
