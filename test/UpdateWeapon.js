#!/usr/bin/env node
const fs = require('fs')
const json = require('json-stringify-pretty-compact')
//const weaponTable = require('./Weapon/weapontable')
const weaponTable = require('Z:/TEMP/test/weapontable')
const weaponTextSC = require('Z:/TEMP/test/weapontext.SC')
const weaponTextCN = require('Z:/TEMP/test/weapontext.CN')
const weaponTextEN = require('Z:/TEMP/test/weapontext.EN')
const weaponTextJA = require('Z:/TEMP/test/weapontext.JA')
const weaponTextKR = require('Z:/TEMP/test/weapontext.KR')

const rawSgos = new Map()

// function json(obj) {
//   return JSON.stringify(obj, null, 2)
// }

const table = weaponTable.variables[0].value

const outDir = 'Z:/TEMP/WeaponUP'
for(const [path, template] of rawSgos) {
  const filename = `${outDir}/${path}.json`
  console.log(`Writing ${filename}` )
  fs.writeFileSync(filename, json(template))
}

// i < 1564
for(var i = 0; i < 1564; i++) {
  const id = table[i].value[0].value
  const path = `Z:/TEMP/test/${id.toUpperCase()}`
  const template = require(path)
  const tableNode = table[i]
  const textSC = weaponTextSC.variables[0].value[i]
  const textCN = weaponTextCN.variables[0].value[i]
  const textEN = weaponTextEN.variables[0].value[i]
  const textJA = weaponTextJA.variables[0].value[i]
  const textKR = weaponTextKR.variables[0].value[i]
  template.meta = {
    id: id,
    level: tableNode.value[4].value * 25,
    category: tableNode.value[2].value,
    unlockState: tableNode.value[5].value,
    dropRateModifier: tableNode.value[3].value,
    StarRating: tableNode.value[6].value,
    nonRequest: tableNode.value[7].value,
    DLCWeapon: tableNode.value[8].value,
    Desc:{
      SC:{
        Ability: textSC.value[2].value,
        Text: textSC.value[1].value,
      },
      CN:{
        Ability: textCN.value[2].value,
        Text: textCN.value[1].value,
      },
      EN:{
        Ability: textEN.value[2].value,
        Text: textEN.value[1].value,
      },
      JA:{
        Ability: textJA.value[2].value,
        Text: textJA.value[1].value,
      },
      KR:{
        Ability: textKR.value[2].value,
        Text: textKR.value[1].value,
      },
    },
  }
  const name = textEN.value[0]
    .value
    .replace(/\s+/g, '')
    .replace(/[^0-9a-zA-Z-]/g, '')
  const filename = `${outDir}/${id}_${name}.json`
  console.log(`Writing ${filename}` )
  //console.log(template)
  fs.writeFileSync(filename, json(template))
}

console.log('Done!')