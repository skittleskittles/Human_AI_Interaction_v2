import { startTimer } from "./timer.js";
import { setRounds, nextTrial, bindTrialButtons } from "./trialAction.js";
import Papa from "papaparse";

// fetch("questions.json")
//   .then((res) => res.json())
//   .then((data) => {
//     setRounds(data);
//     bindTrialButtons();
//     nextTrial();
//     startTimer();
//   });

Papa.parse("questions.csv", {
  download: true,
  header: true,
  complete: function (results) {
    const rawData = results.data;
    const parsedRounds = rawData.map((row) => {
      const answer = row["Correct Order"].split(",").map((s) => s.trim());

      const people = [...answer]; // 保持原顺序
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
          style = [];
        }
      }
      return { answer, people, statements, front_end, style };
    });

    setRounds(parsedRounds);
    bindTrialButtons();
    nextTrial();
    startTimer();
  },
});
