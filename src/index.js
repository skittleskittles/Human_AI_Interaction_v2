import { setQuestionsData } from "./data/variable.js";
import { startTimer } from "./timer.js";
import { nextTrial, bindTrialButtons } from "./trialAction.js";
import { User } from "./collectData.js";
import Papa from "papaparse";
import { getCurDate, getUrlParameters, generateUID } from "./utils.js";
import {
  checkIfUserExists,
  saveOrUpdateUser,
} from "./firebase/saveData2Firebase.js";
import { showLoading, hideLoading } from "./uiState.js";

let urlParams = getUrlParameters();

let objectCount = 5;
if (urlParams.v !== undefined && urlParams.v == "zeta") {
  objectCount = 6;
}

User.prolific_pid = generateUID();
if (urlParams.PROLIFIC_PID !== undefined) {
  User.prolific_pid = urlParams.PROLIFIC_PID;
}

/***
 * Check Multiple Users
 */
showLoading();

const userExists = await checkIfUserExists(User.prolific_pid);

if (userExists) {
  alert("Multiple attempts are not allowed.");
  // 可跳转或阻止加载
  // todo fsy
}

hideLoading();

/***
 * Loading Questions
 */
const csvFile =
  objectCount === 6
    ? "questions_six_objects.csv"
    : "questions_five_objects.csv";

console.log("objectCount:", objectCount);
console.log(csvFile);

Papa.parse(csvFile, {
  download: true,
  header: true,
  complete: async function (results) {
    const rawData = results.data;
    const parsedData = rawData.map((row) => {
      const answer = row["Correct Order"].split(",").map((s) => s.trim());

      const options = [...answer].sort(); // 按字母顺序排序
      const numStatements = parseInt(row["Num Statements"], 10);
      const statements = [];
      for (let i = 1; i <= numStatements; i++) {
        const statement = row[`Statement ${i}`]?.trim();
        if (statement) statements.push(statement);
      }

      let front_end = ["front", "end"]; // 默认值
      if (row["front_end"]) {
        front_end = row["front_end"]
          .replace(/^\s*["']?|["']?\s*$/g, "") // 去掉开头和结尾的引号
          .split(",")
          .map((s) => s.trim());
      }

      let style = [];
      if (row["style"]) {
        try {
          // 替换单引号为双引号，合法化为 JSON 字符串
          style = JSON.parse(row["style"].replace(/'/g, '"'));
        } catch (e) {
          console.warn("Failed to parse style:", row["style"]);
          style = Array(answer.length).fill("blank");
        }
      }
      // map original answer → style, then reassign based on alphabetical option order
      const styleMap = {};
      answer.forEach((name, i) => {
        styleMap[name] = style[i] || "blank"; // fallback to "blank" if mismatch
      });
      const sortedStyle = options.map((name) => styleMap[name]);

      return { answer, options, style: sortedStyle, statements, front_end };
    });

    User.create_time = getCurDate();
    saveOrUpdateUser(getCurDate());

    setQuestionsData(parsedData);
    bindTrialButtons();
    nextTrial();

    startTimer("global");
  },
});
