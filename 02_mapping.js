// Підключаємо необхідні модулі
const elasticsearch = require('elasticsearch')
const client = new elasticsearch.Client({ node: 'http://localhost:9200' })

// Схема для елементу законодачвого акту
const articleMapping = {
  mappings: {
    bot_article: {
      properties: {
        part: { type: 'keyword' },
        chapterNumber: { type: 'keyword' },
        chapterTitle: {
          type: 'text',
          analyzer: 'ukrainian'
         },
        article: { 'type': 'keyword' },
        articleTitle: {
          type: 'text',
          analyzer: 'ukrainian'
        },
        text: {
          type: 'text',
          analyzer: 'ukrainian'
        }
      }
    }
  }
}

client.indices.create({index: 'bot_article', body: articleMapping}, (err, res) => {
  if (err) throw(err)
  console.log('Схема для для статей законодавства створена')
})
