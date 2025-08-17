#!/usr/bin/env node
const fs = require('fs')
const deepEqual = require('fast-deep-equal')
//const json = require('json-stringify-pretty-compact')
const globals = require('../globals.js')
const compiler = require('../converters/compiler.js')
const decompiler = require('../converters/decompiler.js')


const config = require('../data/other/config')
const weaponTable = require('../data/weapon/weapontable')
const weaponText = [
  require('../data/weapon/weapontext.SC'),
  require('../data/weapon/weapontext.CN'),
  require('../data/weapon/weapontext.EN'),
  require('../data/weapon/weapontext.JA'),
  require('../data/weapon/weapontext.KR')
]

const gameText = [
  require('../data/other/TextTable_steam.SC'),
  require('../data/other/TextTable_steam.CN'),
  require('../data/other/TextTable_steam.EN'),
  require('../data/other/TextTable_steam.JA'),
  require('../data/other/TextTable_steam.KR')
]

const gameTextCommon = 'TextTable_steam'
const v_gameTextCommon = [
  `${gameTextCommon}.SC`,
  `${gameTextCommon}.CN`,
  `${gameTextCommon}.EN`,
  `${gameTextCommon}.JA`,
  `${gameTextCommon}.KR`,
]

const gameTextWeapon = 'weapontext'
const v_gameTextWeapon = [
  `${gameTextWeapon}.SC`,
  `${gameTextWeapon}.CN`,
  `${gameTextWeapon}.EN`,
  `${gameTextWeapon}.JA`,
  `${gameTextWeapon}.KR`,
]

const modDir = './modtest/exa'
const weaponModDir = `${modDir}/weapon`
const configPath = `${modDir}/config.sgo`

const weaponTablePath = `${modDir}/WeaponTable.sgo`
const weaponTextPath = [
  `${modDir}/${v_gameTextWeapon[0]}.sgo`,
  `${modDir}/${v_gameTextWeapon[1]}.sgo`,
  `${modDir}/${v_gameTextWeapon[2]}.sgo`,
  `${modDir}/${v_gameTextWeapon[3]}.sgo`,
  `${modDir}/${v_gameTextWeapon[4]}.sgo`,
]

// edf.dll+705F08
const gameTextPath = [
  `${modDir}/${v_gameTextCommon[0]}.txt_sgo`,
  `${modDir}/${v_gameTextCommon[1]}.txt_sgo`,
  `${modDir}/${v_gameTextCommon[2]}.txt_sgo`,
  `${modDir}/${v_gameTextCommon[3]}.txt_sgo`,
  `${modDir}/${v_gameTextCommon[4]}.txt_sgo`,
]

const templateDir = './SgottTemplates'
const coreTemplateDir = `${templateDir}/core`
const weaponTemplateDir = `${templateDir}/weapon`


const filePath = Symbol('path')
const exists = Symbol('exists')
const touched = Symbol('touched')
const files = {}
const DSGOfiles = {}
const { compilers, decompilers } = globals

function populate(key, path, fallback, isDSGO) {
  if(isDSGO){
    if(fs.existsSync(path)) {
      DSGOfiles[key] = decompilers.dsgo(decompiler, fs.readFileSync(path))
      DSGOfiles[key][exists] = true
    } else {
      DSGOfiles[key] = fallback
    }
    DSGOfiles[key][filePath] = path
  }else{
    if(fs.existsSync(path)) {
      //files[key] = sgoToJson.decompiler()(fs.readFileSync(path))
      files[key] = decompilers.sgo(decompiler, fs.readFileSync(path))
      files[key][exists] = true
    } else {
      files[key] = fallback
    }
    files[key][filePath] = path
  }
}

// Becuase upsert will be written repeatedly, only create original file.
function populatealways(key, path, fallback) {
  files[key] = fallback
  files[key][filePath] = path
}

populatealways('config', configPath, config)
populate('WeaponTable', weaponTablePath, weaponTable, true)
for(var i = 0; i < 5; i++){
  populate(v_gameTextWeapon[i], weaponTextPath[i], weaponText[i], true)
  populatealways(v_gameTextCommon[i], gameTextPath[i], gameText[i])
}

function mkdir(path) {
  if(fs.existsSync(path)) return
  fs.mkdirSync(path)
}

console.log('Ensuring mod config files...')
// Compiled, modded SGO files
mkdir(modDir)
mkdir(weaponModDir)
// JSON templates for modding
mkdir(templateDir)
mkdir(coreTemplateDir)
mkdir(weaponTemplateDir)

function patchNode(node, steps, replacement, opts) {
  if(steps.length) {
    return patchStep(node.value, steps, replacement, opts)
  } else if(deepEqual(node, replacement)) {
    return false
  } else {
    Object.assign(node, replacement)
    return true
  }
}

function patchStep(values, [step, ...steps], replacement, opts) {
  if(/^\[\d+]$/.exec(step)) {
    const [index] = /\d+/.exec(step)
    const node = values[index]
    if(node) {
      return patchNode(node, steps, replacement, opts)
    } else if(opts && opts.upsert) {
      const newNode = {}
      values[index] = newNode
      patchNode(newNode, steps, replacement, opts)
      return true
    } else {
      return false
    }
  } else if(/\{.*=.*\}/.exec(step)) {
    if(opts && opts.upsert) {
      console.error(`Upsert not supported with query: ${step}`)
      return false
    }
    const [search, value] = step.slice(1, -1).split('=')
    const searchSteps = search.split(':')
    const nodes = values.filter(v => {
      var current = v
      for(const step of searchSteps) {
        if(!current) return false
        current = current[step]
      }
      return current == value
    })
    var modded = false
    for(const node of nodes) {
      if(patchNode(node, steps, replacement, opts) && !modded) modded = true
    }
    return modded
  } else {
    const node = values.find(n => n.name === step)
    if(node) {
      return patchNode(node, steps, replacement, opts)
    } else if(opts && opts.upsert) {
      const newNode = {type: 'ptr', name: step, value: []}
      values.push(newNode)
      return patchNode(newNode, steps, replacement, opts)
    } else {
      return false
    }
  }
}

function patch(table, path, replacement, opts) {
  const steps = path.split('.')
  const patched = patchStep(table.variables, steps, replacement, opts)
  if(patched) table[touched] = true
}

patch(config, 'WeaponTable', {
  type: 'string',
  name: 'WeaponTable',
  value: 'app:/exa/WeaponTable.sgo',
})
patch(config, 'WeaponText', {
  type: 'string',
  name: 'WeaponText',
  value: 'app:/exa/WeaponText.%LOCALE%.sgo',
})

console.log('Patching weapons tables')
var succeeded = 0
var failed = 0

const weaponMods = fs
  .readdirSync(weaponTemplateDir)
  .filter(name => name.slice(-5).toLowerCase() === '.json')
  .map(name => name.slice(0, -5))

console.log(`Weapon Mods found: ${weaponMods.length}`)

const tableValues = DSGOfiles['WeaponTable'].variables[0].value
const textValues = [
  DSGOfiles[v_gameTextWeapon[0]].variables[0].value,
  DSGOfiles[v_gameTextWeapon[1]].variables[0].value,
  DSGOfiles[v_gameTextWeapon[2]].variables[0].value,
  DSGOfiles[v_gameTextWeapon[3]].variables[0].value,
  DSGOfiles[v_gameTextWeapon[4]].variables[0].value,
]

function findTableNode(id) {
  return tableValues.find(t => t.value[0].value === id)
}

function insertTableNode(index, tableNode, textSCNode, textCNNode, textENNode, textJANode, textKRNode) {
  tableValues.splice(index, 0, tableNode)
  textValues[0].splice(index, 0, textSCNode)
  textValues[1].splice(index, 0, textCNNode)
  textValues[2].splice(index, 0, textENNode)
  textValues[3].splice(index, 0, textJANode)
  textValues[4].splice(index, 0, textKRNode)
}

const ids = {}
const raw = {}

function format(pair) {
  if(!pair) return ''
  const [key, value] = pair
  return ('' + key).padStart(18) + ': ' + ('' + value).padEnd(11)
}

for(const mod of weaponMods) {
  //console.log(`Applying: ${mod}`)
  const template = JSON
    .parse(fs.readFileSync(`${weaponTemplateDir}/${mod}.json`, 'utf8'))

  const {meta} = template
  var path = `${weaponModDir}/${mod}.SGO`
  const {id} = meta
  
  if(id) {
    path = `${weaponModDir}/${id}.SGO`
  }

  if(!id) {
    console.log(`No id located, ${mod} will not be added to the weapon table`)
    raw[path] = template
    continue
  } else if(ids[id]) {
    console.log(`Overwriting already modded weapon with ID ${id}. Previous mod marked as failed.`)
    failed++
  }

  const existing = findTableNode(id)
  var before = meta.before && findTableNode(meta.before)
  var after = meta.after && findTableNode(meta.after)

  function findVar(name) {
    return template.variables.find(n => n.name === name)
  }

  var tableNode, textSCNode, textCNNode, textENNode, textJANode, textKRNode
  if(existing) {
    tableNode = existing
    const index = tableValues.indexOf(existing)
    textSCNode = textValues[0][index]
    textCNNode = textValues[1][index]
    textENNode = textValues[2][index]
    textJANode = textValues[3][index]
    textKRNode = textValues[4][index]
    if(before || after) {
      tableValues.splice(index, 1)
      textValues[0].splice(index, 1)
      textValues[1].splice(index, 1)
      textValues[2].splice(index, 1)
      textValues[3].splice(index, 1)
      textValues[4].splice(index, 1)
    }
  } else {
    tableNode = {
      type: 'ptr',
      value: [{
        type: 'str',
        value: id,
      }, {
        type: 'str',
        value: `app:/exa/weapon/${mod}.SGO`,
      }, {
        type: 'double',
        value: 0,
      }, {
        type: 'double',
        value: 1,
      }, {
        type: 'double',
        value: 0,
      }, {
        type: 'double',
        value: 0,
      }, {
        type: 'ptr',
        value: null,
      },
      {
        type: 'double',
        value: 1,
      },
      {
        type: 'double',
        value: 0,
      }],
    }

    textSCNode = {
      type: 'ptr',
      value: [{
        type: 'str',
        value: '',
      }, {
        type: 'str',
        value: '使用SGOTT制造的定制武器',
      }, {
        type: 'ptr',
        value: null,
      }],
    }

    textCNNode = {
      type: 'ptr',
      value: [{
        type: 'str',
        value: '',
      }, {
        type: 'str',
        value: '使用SGOTT制造的定制武器',
      }, {
        type: 'ptr',
        value: null,
      }],
    }

    textENNode = {
      type: 'ptr',
      value: [{
        type: 'str',
        value: '',
      }, {
        type: 'str',
        value: 'A custom weapon made using SGOTT',
      }, {
        type: 'ptr',
        value: null,
      }],
    }

    textJANode = {
      type: 'ptr',
      value: [{
        type: 'str',
        value: '',
      }, {
        type: 'str',
        value: 'SGOTTを使用して作られたカスタム武器',
      }, {
        type: 'ptr',
        value: null,
      }],
    }

    textKRNode = {
      type: 'ptr',
      value: [{
        type: 'str',
        value: '',
      }, {
        type: 'str',
        value: 'KR A custom weapon made using SGOTT',
      }, {
        type: 'ptr',
        value: null,
      }],
    }
  }

  tableNode.value[1].value = `app:/exa/Weapon/${id}.sgo`
  if(meta.category != null) tableNode.value[2].value = meta.category
  if(meta.dropRateModifier != null) tableNode.value[3].value = meta.dropRateModifier
  if(meta.level != null) tableNode.value[4].value = meta.level / 25
  if(meta.unlockState != null) tableNode.value[5].value = meta.unlockState
  if(meta.StarRating != null) tableNode.value[6].value = meta.StarRating
  if(meta.nonRequest != null) tableNode.value[7].value = meta.nonRequest
  if(meta.DLCWeapon != null) tableNode.value[8].value = meta.DLCWeapon

  var textDesc, textEntry
  if(meta.Desc != null){
    textDesc = meta.Desc.SC
    if(textDesc != null){
      textEntry = textDesc.Ability
      if(textEntry != null){
        textSCNode.value[2].value = textEntry
      }

      textEntry = textDesc.Text
      if(textEntry != null){
        textSCNode.value[1].value = textEntry
      }
    }

    textDesc = meta.Desc.CN
    if(textDesc != null){
      textEntry = textDesc.Ability
      if(textEntry != null){
        textCNNode.value[2].value = textEntry
      }

      textEntry = textDesc.Text
      if(textEntry != null){
        textCNNode.value[1].value = textEntry
      }
    }

    textDesc = meta.Desc.EN
    if(textDesc != null){
      textEntry = textDesc.Ability
      if(textEntry != null){
        textENNode.value[2].value = textEntry
      }

      textEntry = textDesc.Text
      if(textEntry != null){
        textENNode.value[1].value = textEntry
      }
    }

    textDesc = meta.Desc.JA
    if(textDesc != null){
      textEntry = textDesc.Ability
      if(textEntry != null){
        textJANode.value[2].value = textEntry
      }

      textEntry = textDesc.Text
      if(textEntry != null){
        textJANode.value[1].value = textEntry
      }
    }

    textDesc = meta.Desc.KR
    if(textDesc != null){
      textEntry = textDesc.Ability
      if(textEntry != null){
        textKRNode.value[2].value = textEntry
      }

      textEntry = textDesc.Text
      if(textEntry != null){
        textKRNode.value[1].value = textEntry
      }
    }
    // end
  }

  const namesc = findVar('name.sc').value
  textSCNode.value[0].value = namesc
  const namecn = findVar('name.cn').value
  textCNNode.value[0].value = namecn
  const nameen = findVar('name.en').value
  textENNode.value[0].value = nameen
  const nameja = findVar('name.ja').value
  textJANode.value[0].value = nameja
  const namekr = findVar('name.kr').value
  textKRNode.value[0].value = namekr

  if(after) {
    insertTableNode(tableValues.indexOf(after) + 1, tableNode, textSCNode, textCNNode, textENNode, textJANode, textKRNode)
  } else if(before) {
    insertTableNode(tableValues.indexOf(before), tableNode, textSCNode, textCNNode, textENNode, textJANode, textKRNode)
  } else if(!existing) {
    tableValues.push(tableNode)
    textValues[0].push(textSCNode)
    textValues[1].push(textCNNode)
    textValues[2].push(textENNode)
    textValues[3].push(textJANode)
    textValues[4].push(textKRNode)
  }

  ids[id] = {path, template}
}

succeeded = Object.keys(ids).length

if(succeeded) {
  DSGOfiles['WeaponTable'][touched] = true
  for(var i = 0; i < 5; i++){
    DSGOfiles[v_gameTextWeapon[i]][touched] = true
  }
}

// write to files

for(const [path, template] of Object.entries(raw)) {
  //console.log(`Writing file: ${path}`)
  fs.writeFileSync(path, compilers.dsgo(compiler, template, {}, globals))
}

for(const {path, template} of Object.values(ids)) {
  //console.log(`Writing file: ${path}`)
  //fs.writeFileSync(path, jsonToSgo.compiler()(template))
  fs.writeFileSync(path, compilers.dsgo(compiler, template, {}, globals))
}

const coreMods = fs
  .readdirSync(coreTemplateDir)
  .filter(file => /\.json$/.test(file))
  .map(name => name.slice(0, -5))

console.log(`Core Mods found: ${coreMods.length}`)

for(const mod of coreMods) {
  //console.log(`Applying: ${mod}`)
  const template = JSON
    .parse(fs.readFileSync(`${coreTemplateDir}/${mod}.json`, 'utf8'))

  for(const [path, operations] of Object.entries(template)) {
    const file = files[path]
    if(!file) {
      console.error(`File not found: ${path}, aborting...`)
      continue
    }
    for(const [steps, replacement] of Object.entries(operations.patch || {})) {
      patch(file, steps, replacement)
    }
    for(const [steps, replacement] of Object.entries(operations.upsert || {})) {
      patch(file, steps, replacement, {upsert: true})
    }
  }

  succeeded++
}

// Sort node names, otherwise game cannot read them.
for(var i = 0; i < 5; i++){
  const file = files[v_gameTextCommon[i]]
  if(file[touched]){
    file.variables.sort((a, b) => {
      const nameA = a.name;
      const nameB = b.name;
      if (nameA < nameB) return -1;
      if (nameA > nameB) return 1;
      return 0;
    });
  }
}

for(const file of Object.values(files)) {
  if(file[exists] && !file[touched]) continue
  const path = file[filePath]
  console.log(`Writing sgo file: ${path}`)
  // here is sgo
  //fs.writeFileSync(path, jsonToSgo.compiler()(file))
  fs.writeFileSync(path, compilers.sgo(compiler, file, {}, globals))
}

for(const file of Object.values(DSGOfiles)) {
  if(file[exists] && !file[touched]) continue
  const path = file[filePath]
  console.log(`Writing dsgo file: ${path}`)
  fs.writeFileSync(path, compilers.dsgo(compiler, file, {}, globals))
}

console.log(`Done, ${succeeded} succeeded and ${failed} failed`)
