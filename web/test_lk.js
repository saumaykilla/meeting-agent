const { RoomAgentDispatch, RoomConfiguration } = require('@livekit/protocol');
const { AccessToken } = require('livekit-server-sdk');

const at = new AccessToken("key", "secret");
at.identity = "test";
at.roomConfig = new RoomConfiguration({
  agents: [
    new RoomAgentDispatch({
      agentName: "CC"
    })
  ]
});
console.log(at.toJwt().length > 0 ? "Success" : "Empty Token");
