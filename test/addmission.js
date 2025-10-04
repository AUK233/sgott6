const fs = require('fs');
const path = require('path');
const readline = require('readline');
const json = require('json-stringify-pretty-compact')

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function main() {
  try {
    const listFilePath = await new Promise(resolve => {
      rl.question('Mission list path: ', answer => {
    	resolve(answer.trim().replace(/^['"]|['"]$/g, ''));
      });
    });

    //const listFilePath = "z:\\TEMP\\MissionList_DLC1.list.json"

    const dirPath = path.dirname(listFilePath);
    const baseName = path.basename(listFilePath, '.list.json');

    // read mission list
    const listFile = JSON.parse(fs.readFileSync(listFilePath, 'utf8'));
    const listData = listFile.variables[0].value;
    if (!Array.isArray(listData)) {
      throw new Error('It is not a list file.');
    }

    // read mission text
    const textFiles = fs.readdirSync(dirPath).filter(file => 
      file.startsWith(baseName + '.txt') && file.endsWith('.json') && file !== path.basename(listFilePath)
    );

    const textDataList = textFiles.map(file => {
      const filePath = path.join(dirPath, file);
      return {
        path: filePath,
        file: JSON.parse(fs.readFileSync(filePath, 'utf8'))
      };
    });

    // check list and text
    textDataList.forEach(item => {
        item.data = item.file.variables[0].value;

      if (!Array.isArray(item.data)) {
        throw new Error(`${item.path} is not a text file.`);
      }
      if (item.data.length !== listData.length) {
        throw new Error(`${item.path} 's count doesn't equal list.`);
      }
    });

    // input index
    const index = parseInt(await new Promise(resolve => {
      rl.question(`Location where mission is add (0-${listData.length}): `, answer => {
        resolve(answer.trim());
      });
    }));

    if (isNaN(index) || index < 0 || index > listData.length) {
      throw new Error('Invalid location!');
    }

    // 插入新节点到 list 数组
    const newNodeValue = {
      type: "ptr",
      value: [
        {type: "double", value: index},
        {type: "str", value: 'missionfile'},
        {type: "str", value: 'image'},
        {type: "ptr", value: [
          {type: "double", value: index+1}
        ]},
        {type: "double", value: index},
        {type: "double", value: 0},
        {type: "double", value: 0},
        {type: "double", value: 0},
        {type: "str", value: "BGM_E5S02_EDFHonbu"},
        {type: "double", value: 0.10000000149011612},
        {name: "flags", type: "double", value: 8}
      ]
    };
    listData.splice(index, 0, newNodeValue);

    // update list
    for (let i = index + 1; i < listData.length; i++) {
      listData[i].value[0].value += 1;
      listData[i].value[4].value += 1;

      const listUnlock = listData[i].value[3].value;
      if(Array.isArray(listUnlock) > 0){
        for(var j = 0; j < listUnlock.length; j++){
          listUnlock[j].value += 1;
        }
      }
      // end
    }

    // update text
    const nullNode ={
      type: "ptr",
      value: [
        {type: "string", value: `${index}`},
        {type: "string", value: `${index}`}
      ]
    }
    textDataList.forEach(item => {
      item.data.splice(index, 0, nullNode);
    });

    // write json
    // fs.writeFileSync(listFilePath, JSON.stringify(listFile, null, 2));
    fs.writeFileSync(listFilePath, json(listFile));
    textDataList.forEach(item => {
      //fs.writeFileSync(item.path, JSON.stringify(item.file, null, 2));
      fs.writeFileSync(item.path, json(item.file));
    });

    console.log('Done!');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    rl.close();
  }
}

main();
