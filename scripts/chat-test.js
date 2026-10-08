// End-to-end check: send a message to the agent's room over XMPP and time the bot's reply.
// Usage: ROOM=<appId>_<chatId>@conference.<domain> node scripts/chat-test.js "your question"
// Needs: npm i @xmpp/client, and an XMPP user (ejabberdctl register tester <domain> <password>).
const { client, xml } = require('@xmpp/client')

const ROOM = process.env.ROOM
const DOMAIN = process.env.XMPP_DOMAIN || 'localhost'
const SERVICE = process.env.XMPP_SERVICE || 'ws://localhost:5443/ws'
const USER = process.env.XMPP_USER || 'tester'
const PASS = process.env.XMPP_PASS || 'TesterPw1'
const question = process.argv[2] || 'In one sentence, what is a chat SDK?'

if (!ROOM) {
  console.error('Set ROOM=<appId>_<chatId>@conference.<domain>')
  process.exit(2)
}

const c = client({ service: SERVICE, domain: DOMAIN, username: USER, password: PASS })
let t0

c.on('error', (e) => console.log('xmpp error', e.message))
c.on('stanza', (s) => {
  if (!s.is('message') || s.attrs.type !== 'groupchat') return
  const body = s.getChildText('body')
  const from = s.attrs.from || ''
  if (!body || from.endsWith('/' + USER)) return
  console.log(`[${((Date.now() - t0) / 1000).toFixed(2)}s] ${from.split('/')[1]}: ${body}`)
  if (/bot/i.test(from)) setTimeout(() => process.exit(0), 300)
})
c.on('online', async () => {
  await c.send(xml('presence', { to: `${ROOM}/${USER}` }, xml('x', { xmlns: 'http://jabber.org/protocol/muc' })))
  setTimeout(async () => {
    t0 = Date.now()
    await c.send(xml('message', { to: ROOM, type: 'groupchat' }, xml('body', {}, question)))
    console.log('sent:', question)
  }, 3000)
})
c.start().catch((e) => console.log('start failed', e.message))
setTimeout(() => {
  console.log('timeout after 120s')
  process.exit(1)
}, 120000)
