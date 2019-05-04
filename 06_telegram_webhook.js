require('dotenv').config()

// Підключаємо необхідні бібліотеки
const request = require('request')
console.log(`https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/setWebhook?url=${process.env.FULLDOMAIN}/telegram`)
request({
  'uri': `https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/setWebhook?url=${process.env.FULLDOMAIN}/telegram`,
  'method': 'GET'
}, (err, res, body) => {
  if (err) console.error('Unable to send message:' + err)
  console.log(body)
})