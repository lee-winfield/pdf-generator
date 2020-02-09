process.env['FONTCONFIG_PATH'] = process.env['LAMBDA_TASK_ROOT'];
const PDF = require('html-pdf')
const AWS = require('aws-sdk')
const createHTML = require('create-html')

const formatCurrency = (num) => {
  const roundedNum = Math.round(num * 100).toString()
  const numDollars = roundedNum.substring(0, roundedNum.length - 2) || '0'
  const numCents = roundedNum.substring(roundedNum.length - 2)

  return `${numDollars}.${numCents.length === 1 ? numCents + '0' : numCents}`
}


const generateDocumentHTML = (lineItems, recipientInfo, invoiceNum) => {
  const date = new Date()
  const dateString = `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`
  const totalBill = lineItems.reduce((acc, li) => acc + li.percentage * li.amount / 100, 0)

  const tableRows = lineItems.map(li =>
    `<tr>
      <td>${li.serviceDate}</td>
      <td>${li.name}</td>
      <td>${formatCurrency(li.amount)}</td>
      <td>${li.percentage}</td>
      <td>${formatCurrency(li.percentage * li.amount / 100)}</td>
    </tr>`
  ).join('')

  const table = `<div class="container">
    <div class="flex-container">
      <h1 class="doc-heading xl">INVOICE</h1>
    </div>
    <div>
      <h3 class="header">Winfield Supply Company</h3>
      <div class="flex-container">
        <div class="contact-info">
          <p>4679 Hamman Industrial Parkway</p>
          <p>Willoughby, OH 44094</p>
          <p>Phone: 440-725-5544</p>
          <p>Fax: 440-951-3140</p>
        </div>
        <div class="invoice-info">
          <div class="inline">
            <p class="bold">Invoice No: </p>
            <p>${invoiceNum}</p>
          </div>
          <div class="inline">
            <p class="bold">Date: </p>
            <p>${dateString}</p>
          </div>
        </div>
      </div>
      <div class="recipient-info">
        <p class="bill-to bold">Bill To</p>
        <p>${recipientInfo.name}</p>
        <p>${recipientInfo.address1}</p>
        <p>${recipientInfo.address2}</p>
        <p>Phone: ${recipientInfo.phone}</p>
      </div>

      <table>
        <thead class="bold white-font">
          <tr>
            <td class="text-center">Service Date</td>
            <td class="text-center">Description</td>
            <td class="text-center">Bill Total</td>
            <td class="text-center">% of Bill</td>
            <td class="text-center">Total Owed</td>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
          <tr class="bold" id="total">
            <td></td>
            <td></td>
            <td></td>
            <td>TOTAL</td>
            <td>${formatCurrency(totalBill)}</td>
          </tr>
        </tbody>
      </table>
      <div class="footer">
        <p class="center" >Make all checks payable to Claudia Winfield</p>
        <p class="bold italic center">THANK YOU FOR YOUR BUSINESS!</p>
      </div>
    </div>
  </div>`

  return createHTML({
    title: 'example',
    body: table,
    zoom: 0.5,
    base: './',
    css: 'https://s3.us-east-2.amazonaws.com/cjwinfield/styles.css',
  })
}

const lambda = async (event) => {
  const s3 = new AWS.S3()
  const { lineItems, recipientInfo, invoiceNum, fileName } = event

  const phantomPath = './phantomjs'
  const options = {
    phantomPath,
    type: 'pdf',
    "format": "letter",
    "height": "11in",
    "width": "8.5in",
  }
  const html = generateDocumentHTML(lineItems, recipientInfo, invoiceNum)
  const pdf = PDF.create(html, options)

  const createStream = (pdf) =>
    new Promise((resolve, reject) => {
      pdf.toStream((err, stream) => {
        if (err) {
          console.error('Failed to create stream from pdf', err)
          reject(Error('failed'))
        } else {
          resolve(stream)
        }
      })
    })


  const stream = await createStream(pdf)

  const params = {
    Bucket: 'cjwinfield',
    Key: `recipient/${fileName}.pdf`,
    Body: stream,
  }
  const res = await s3.putObject(params).promise()

  const response = {
    statusCode: 200,
    body: 'It was successfull'
  }
  return response
}



exports.handler = lambda
