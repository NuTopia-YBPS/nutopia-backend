import fs from "fs-extra";
class DB {
  constructor() {
    this.tmp = {};
  }
  createCollection(name) {
    this.tmp[name] = {};
    this.#save();
  }
  createData(docName, key, value) {
    this.tmp[docName][key] = value;
    this.#save();
  }
  deleteData(docName, key){
    
  }
  #save() {
    fs.writeJsonSync("./index.json", this.tmp);
  }
}
export default DB;
