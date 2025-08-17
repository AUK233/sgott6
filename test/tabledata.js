const fs = require('fs')
const table = require('../data/weapon/weapontable').variables[0].value
const TextCN = require('../data/weapon/weapontext.SC').variables[0].value
const TextEN = require('../data/weapon/weapontext.EN').variables[0].value
const TextJA = require('../data/weapon/weapontext.JA').variables[0].value

const classes = [
  'ranger',
  'palewing',
  'fencer',
  'engineer',
]

const unlockStates = [
  '',
  'Starter',
  'DLC',
  'DLC',
]

const dlcweapon = [
  'main',
  'mp01',
  'mp02',
]

const NonRequestText = [
  'require',
  'without',
]

const data = table.map(({value: node}, i) => {
  const id = node[0].value
  const nonRequest = node[7].value
  const dlc = node[8].value
  const namecn = TextCN[i].value[0].value
  const nameen = TextEN[i].value[0].value
  const nameja = TextJA[i].value[0].value
  const level = Math.floor(node[4].value * 25)
  const category = node[2].value
  const character = classes[Math.floor(category / 100)]
  var RequestText
  if(nonRequest<2){
    RequestText = NonRequestText[nonRequest]
  }else{
    RequestText = nonRequest;
  }

  return {
    id: id,
    namecn: namecn,
    nameen: nameen,
    nameja: nameja,
    level: level,
    character: character,
    category: category,
    odds: unlockStates[node[5].value] || (Math.floor(node[3].value * 100)),
    dlc: dlcweapon[dlc],
    Request: RequestText,
  }
})

const props = [
  'character',
  'category',
  'id',
  'level',
  'namecn',
  'nameen',
  'nameja',
  'odds',
  'dlc',
  'Request',
]
const html = `
<html>
<head>
  <style>
    html {
      color: black;
      background-color: defeda;
    }

    td {
      padding: 0.2em;
    }

    tr:nth-child(even) {
      background-color: #ffffff;
    }

    .id {
      opacity: 0.7;
    }

    .character.ranger {
      color: #ff0000;
    }
    .character.palewing {
      color: #0000ff;
    }
    .character.engineer {
      color: #00ff00;
    }
    .character.fencer {
      color: #000000;
    }

    .odds, .level, .Request {
      text-align: right;
    }

    .odds:after {
      content: ' %';
      opacity: 0.5;
      font-size: 0.8em;
    }

    .odds {
      color: #00aaaa;
    }

    .odds[class*="Starter"] {
      color: #00ff00;
    }
    .odds[class*="DLC"] {
      color: #0000ff;
    }

    .odds[class*="Starter"]:after, .odds[class*="DLC"]:after {
      content: '';
    }

    .odds[class*="100"] {
      opacity: 0.5;
    }
    .odds[class*="100"]:after {
      opacity: 1;
    }

    .odds[class*=" 1"] {
      color: inherit;
    }

    .dlc[class*="mp01"] {
      color: #5900ff;
    }

    .dlc[class*="mp02"] {
      color: #b700ff;
    }

    .Request[class*="require"] {
      color:rgb(255, 0, 0);
    }

    .Request[class*="without"] {
      color:rgb(0, 221, 255);
    }

  </style>
</head>
<body>
  <table>
    <thead>
      <th>Character</th>
      <th>Category</th>
      <th>ID</th>
      <th>Lvl</th>
      <th>NameCN</th>
      <th>NameEN</th>
      <th>NameJP</th>
      <th>Odds</th>
      <th>DLC</th>
      <th>Request</th>
    </thead>
    <tbody>
      ${data.map(wpn => {
        return '<tr>' +
          props.map(p => `<td class="${p} ${wpn[p]}">${wpn[p]}</td>`).join('') +
        '</tr>'
       }).join('\n')}
    </tbody>
  </table>
</body>
`

fs.writeFileSync('./weapons.html', html)
