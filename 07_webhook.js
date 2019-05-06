'use strict'
require('dotenv').config()
const fs = require('fs')

// Підключаємо модуль пошуку
const elasticsearch = require('elasticsearch')
elasticsearch.Promise = global.Promise
const client = new elasticsearch.Client({ node: 'http://localhost:9200' })

// Підключаємо сервер, що буде відповідати на запити
const express = require('express')
const bodyParser = require('body-parser')
const app = express()
app.use(bodyParser.json())

// Підключаємо сервер з сертифікатом безпеки
const credentials = {
  key: fs.readFileSync(`/etc/letsencrypt/live/${process.env.DOMAIN}/privkey.pem`, 'utf8'),
  cert: fs.readFileSync(`/etc/letsencrypt/live/${process.env.DOMAIN}/cert.pem`, 'utf8'),
  ca: fs.readFileSync(`/etc/letsencrypt/live/${process.env.DOMAIN}/chain.pem`, 'utf8')
}
const https = require('https')
const httpsServer = https.createServer(credentials, app)

// Повідомлення про роботу сервера
httpsServer.listen(443, () => console.log('HTTPS Server running on port 443'))

// Робота зі статичнми файлами
const basicHtmlResponse = fs.readFileSync('./data/article.html').toString()
const MarkdownIt = require('markdown-it')
const md = new MarkdownIt()

// Бібілотека для надсилання запитів
const request = require('request')

// Перевірка аутентичності сервера для Facebook
app.get('/webhook', (req, res) => {
  if (req.query['hub.mode'] && req.query['hub.mode'] === 'subscribe' &&
    req.query['hub.verify_token'] && req.query['hub.verify_token'] === process.env.VERIFY_TOKEN) {
    res.status(200).send(req.query['hub.challenge'])
  } else {
    res.sendStatus(403)    
  }
})

const index = 'bot_article'

// Отримання повідомлень від Facebook
app.get('/article', async (req, res) => {
  if (req.query && req.query.query) {
    const result = await findArticle(req.query.query)
    return res.status(200).send(result)
  }
  if (req.query && req.query.id) {
    const result = await findArticleById(req.query.id)
    return res.status(200).send(result)
  }
  return res.status(404).send([])
})

// Знайти запис за текстовим запитом та повернути масив відпвідей
const findArticle = async (query) => {
  const searchResult = await client.search({ index, body: { query: { multi_match: { query, fields: [ 'article^3', 'articleTitle^2', 'text' ] } } } })
  if (!searchResult.hits) return []
  return searchResult.hits.hits.map(el => Object.assign(el._source, { id: el._id }))
}

// Знайти запис за id
const findArticleById = async (id) => {
  const searchResult = await client.get({ index, type: '_doc', id, ignore: 404 })
  if (!searchResult.found) return ''
  const result = searchResult._source
  let html = basicHtmlResponse
  html = html.replace('{{ text }}', md.render(result.text))
  for (let key in result) html = html.replace(new RegExp('\\{\\{\\s*' + key + '\\s*\\}\\}', 'g'), result[key])
  return html
}

// Cтворюємо посилання для обробки Facebook 
app.post('/webhook', (req, res) => {
  let body = req.body
  if (body.object === 'page') {
    body.entry.forEach((entry) => {
      let event = entry.messaging[0]
      let sender = event.sender.id
      if (event.message) handleMessage(sender, event.message)
      if (event.postback) handlePostback(sender, event.postback)
    })
    res.status(200).send('EVENT_RECEIVED')
  } else {
    res.sendStatus(404)
  }
})

// Обробка повідомлень
async function handleMessage(sender, message) {
  let response
  if (message.text) response = await createFBList(message.text)
  callSendAPI(sender, response)
}

// Надсилання згенерованого повідомлення
function callSendAPI(id, message) {
  let requestBody = { 'recipient': { id }, message }
  request({
    'uri': 'https://graph.facebook.com/v2.6/me/messages',
    'qs': { 'access_token': process.env.PAGE_ACCESS_TOKEN },
    'method': 'POST',
    'json': requestBody
  }, (err, res, body) => {
    if (err) console.error('Unable to send message:' + err)
  })
}

// Створення змісту відповіді для Facebook
async function createFBList(message) {
  let list = {
    'attachment': {
      'type': 'template',
      'payload': {
        'template_type': 'list',
        'top_element_style': 'compact',
        'elements': []
      }
    }
  }

  let articles = await findArticle(message)
  if (articles.length === 0) return { 'text': 'На жаль, не можу знайти статтю за таким запитом. Спробуйте ще! ;)' }
  articles = articles.slice(0, 4)
  if (articles.length > 1) {
    articles = articles.map(el => {
      return {
        title: `Стаття ${el.article}. ${el.articleTitle}`,
        subtitle: el.chapterTitle,
        buttons: [
          { 
            title: 'Переглянути',
            type: 'web_url',
            url: 'https://klh.dp.ua/article?id=' + el.id,
            messenger_extensions: true,
            webview_height_ratio: 'full'
          }
        ]
      }
    })
    list.attachment.payload.elements = articles
  }
  if (articles.length === 1) {
    let el = articles[0]
    list = {
      attachment: {
        type: 'template',
        payload: {
          template_type: 'generic',
          elements: [
            {
              title: `Стаття ${el.article}. ${el.articleTitle}`,
              subtitle: el.chapterTitle,
              default_action: {
                type: 'web_url',
                url: 'https://klh.dp.ua/article?id=' + el.id,
                messenger_extensions: true,
                webview_height_ratio: 'full'
              },
              buttons: [
                { 
                  title: 'Переглянути',
                  type: 'web_url',
                  url: 'https://klh.dp.ua/article?id=' + el.id,
                  messenger_extensions: true,
                  webview_height_ratio: 'full'
                }
              ]
            }
          ]
        }
      }
    }
  }
  return list
}

// Cтворюємо посилання для обробки Telegram
app.post('/telegram', async (req, res) => {
  let body = req.body
  let text = body.message.text
  let response
  if (text === '/help' || text === '/start') {
    response = { text: 'Цей бот призначений для пошуку статей Кримінального кодексу України. ' +
    'Для початку роботи введіть ключові слова і бот запропонує вам відповідні статті з Кодексу. ' +
    'Якщо ви введете номер статті, то отримаєте саму статтю, а також перелік пов\'язаних статей.' }
  } else {
    response = await createTelegramList(body.message.text)
  }
  let chat_id = body.message.chat.id

  let requestBody = Object.assign({ chat_id, parse_mode: 'Markdown' }, response)
  request({
    'uri': `https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendMessage`,
    'method': 'POST',
    'json': requestBody
  }, (err, res, body) => {
    if (err) console.error('Unable to send message:' + err)
  })
  res.status(200).send('EVENT_RECEIVED')
})


// Створення змісту відповіді для Telegram
async function createTelegramList(message) {
  let text = 'Знайдено такі статті:\n\n'

  let articles = await findArticle(message)
  if (articles.length === 0) return { text: 'На жаль, не можу знайти статтю за таким запитом. Спробуйте ще! ;)'}
  articles = articles.slice(0, 3)
  let articleTexts = articles.map(el => `*Стаття ${el.article}*\n*${el.articleTitle}*\n${el.chapterTitle}\n\n[Переглянути](https://klh.dp.ua/article?id=${el.id})`)
  articleTexts = articleTexts.join('\n\n')
  text += articleTexts
  const inline_keyboard = articles.map(el => {
    return [{
      text: `Стаття ${el.article}`,
      url: `https://klh.dp.ua/article?id=${el.id}`
    }]
  })
  const reply_markup = { inline_keyboard }
  return { text, reply_markup }
}