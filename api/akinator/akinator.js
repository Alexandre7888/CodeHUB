const Aki = require("aki-api");
const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function jogarAkinator() {
  const aki = new Aki("pt"); // idioma português
  await aki.start();

  console.log("Bem-vindo ao Akinator!");
  console.log(`Pergunta: ${aki.question}`);
  console.log(`Respostas: ${aki.answers.join(", ")}`);

  while (aki.progression < 95) {
    await new Promise(resolve => {
      rl.question("Sua resposta (0=Sim, 1=Não, 2=Não sei, 3=Provavelmente, 4=Provavelmente não): ", async (input) => {
        const resposta = parseInt(input);
        if (isNaN(resposta) || resposta < 0 || resposta > 4) {
          console.log("Resposta inválida! Tente de 0 a 4.");
        } else {
          await aki.step(resposta);
          if (aki.progression < 95) {
            console.log(`\nPróxima pergunta: ${aki.question}`);
            console.log(`Respostas: ${aki.answers.join(", ")}`);
          }
        }
        resolve();
      });
    });
  }

  console.log("\nAkinator acha que é:");
  console.log(JSON.stringify(aki.answers, null, 2));

  rl.close();
}

jogarAkinator();