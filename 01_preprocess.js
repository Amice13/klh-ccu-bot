// Бібліотека для зчиатування файлів
const fs = require('fs')

// Читаємо текст з файла
let text = fs.readFileSync('./data/kku.txt')

// Перетворюємо текст з буфера на строку
text  = text.toString()

// Видаляємо прикінцеві положення
text = text.replace(/\nПРИКІНЦЕВІ.*/s, '')

// Визначаємо частини
let parts = text.match(/(ЗАГАЛЬНА ЧАСТИНА|ОСОБЛИВА ЧАСТИНА).*?(?=ОСОБЛИВА ЧАСТИНА|$)/sg)

// Створюємо об'єкти з частин
parts = parts.reduce((array, el) => array.concat({ text: el }), [])

// Даємо назву кожній з частин
parts[0].part = 'Загальна частина'
parts[1].part = 'Особлива частина'

// Визначаємо розділи
parts = parts.reduce((array, el) => {
  let chapters = el.text.match(/(\n|^)розділ((?!\nрозділ).)*/sgi)

  // Визначаємо номери, назви та текст розділів
  chapters = chapters.map(chapter => {
    let chapterParts = chapter.match(/(?:\n|^)розділ\s(.*?)\s?\n(.*?)\n(.*)/si)
    return {
      part: el.part,
      chapterNumber: chapterParts[1],
      chapterTitle: chapterParts[2],
      text: chapterParts[3]
    }
  })
  return array.concat(chapters)
}, [])

// Визначаємо зміст статей
parts = parts.reduce((array, el) => {
  let articles = el.text.match(/(\n|^)стаття((?!\nстаття).)*/sgi)

  // Визначаємо номери статей та їх текст
  articles = articles.map(article => {
    let articleParts = article.match(/(?:\n|^)Стаття\s(.*?)\.\s(.*?)\n(.*)/si)
    return {
      part: el.part,
      chapterNumber: el.chapterNumber,
      chapterTitle: el.chapterTitle,
      article: articleParts[1],
      articleTitle: articleParts[2],
      text: articleParts[3]
    }
  })
  return array.concat(articles)
}, [])

// Радіємо результатам
console.log(parts)

