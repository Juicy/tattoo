#!/usr/bin/env node
"use strict";

const shell = require('shelljs'),
  path = require('path'),
  got = require('got'),
  fs = require("fs");

const TRAVIS_API_TOKEN = process.env.TRAVIS_API_TOKEN;
const GITHUB_API_TOKEN = process.env.GITHUB_API_TOKEN;
const repoRoot = process.cwd();//path.join(__dirname, '..');

console.log(`Fetching Git commit hash...`);

const gitCommitRet = shell.exec('git rev-parse HEAD', {
  cwd: repoRoot
});

if (0 !== gitCommitRet.code) {
  console.error('Error getting git commit hash');

  process.exit(-1);
}

const gitCommitHash = gitCommitRet.stdout.trim();

console.log(`Git commit: ${gitCommitHash}`);



// Read Synchrously
const tattooConfig = JSON.parse(fs.readFileSync(path.join(repoRoot, 'test/tattoo.json')));

var currentRepo = tattooConfig.name;

var requestBuilds = [];

const owner = "Juicy";
const repo = "juicy-html";
const sha = "1f732587d4d6cb44a510ab5a50771dce068d36ef";
const description = `Tattoo build with ${owner}/${repo}`;

function setGitHubCommitStatus(owner, repo, sha, state, description, target_url) {
    //state can be error, failure, pending, or success
    console.log("url", `https://api.github.com/repos/${owner}/${repo}/statuses/${sha}`);
    return got.post(`https://api.github.com/repos/${owner}/${repo}/statuses/${sha}`, {
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/vnd.github.v3+json",
                "Authorization": `token ${GITHUB_API_TOKEN}`,
            },
        body: JSON.stringify({
            "state": state,
            "target_url": target_url,
            "description": description,
            "context": "Tattoo"
        })});
}

var i = 0;

function checkRequestStatus(dependantRepo, requestId, resolve, reject) {
  //Juicy%2Fjuicy-html commit: 1f732587d4d6cb44a510ab5a50771dce068d36ef
  got.get(`https://api.travis-ci.org/repo/${dependantRepo}/request/${requestId}`, {
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Travis-API-Version": "3",
        "Authorization": `token ${TRAVIS_API_TOKEN}`,
      }
    })
    .then((response) => {
      console.log(`Status of request`);
      //console.log(response.body);

      const respJSON = JSON.parse(response.body);
      if(respJSON.state === "finished" && respJSON.result === "approved") {
        console.log("i", i);
        /*if(i < 2) {
          respJSON.builds = null;
          setTimeout(() => {
                checkRequestStatus(dependantRepo, requestId, resolve)
              }, 10000);
        }
        i++;*/
        if(respJSON.builds && respJSON.builds[0] && respJSON.builds[0].state) {
          //perhaps these are the correct states: failed, passed, created, started, errored, or canceled
          
          const state = respJSON.builds[0].state;
          const target_url = `https://travis-ci.org/${respJSON.repository.slug}${respJSON.builds[0]["@href"]}`;

          switch(state) {
            case "errored":
            case "canceled":
              console.log("error");
              setGitHubCommitStatus(owner, repo, sha, "error", description, target_url).then(() => {
                resolve("error");
              }).catch(reject);
              break;

            case "failed":
              console.log("failure");
              setGitHubCommitStatus(owner, repo, sha, "failure", description, target_url).then(() => {
                resolve("passed");
              }).catch(reject);
              break;

            case "passed":
              console.log("success");
              setGitHubCommitStatus(owner, repo, sha, "passed", description, target_url).then(() => {
                resolve("passed");
              }).catch(reject);
              break;


            default:
              console.log("going");
              setTimeout(() => {
                checkRequestStatus(dependantRepo, requestId, resolve)
              }, 10000);
              break;
          }

        }
      }
    });
}




const promise = new Promise((resolve, reject) => {
  setGitHubCommitStatus(owner, repo, sha, "pending", description, `https://api.travis-ci.org/${owner}/${repo}`);

  checkRequestStatus("Juicy%2Fimported-template", "103166781", resolve, reject);
});

requestBuilds.push(promise);

Promise.all(requestBuilds).then((result) => {
  console.log("ide do domu", result);
}).catch((result) => {
  console.log("icos nie poszlo", result);
});



tattooConfig.dependants.forEach((dependantRepo)=>{
return;

    console.log(`Calling Travis for ${dependantRepo}...`);

    const currentRepoSlug = currentRepo.replace('/','%2F');
    const dependantRepoSlug = dependantRepo.replace('/','%2F');


    got.post(`https://api.travis-ci.org/repo/${dependantRepoSlug}/requests`, {
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Travis-API-Version": "3",
        "Authorization": `token ${TRAVIS_API_TOKEN}`,
      },
      body: JSON.stringify({
        request: {
          message: `Trigger build at ${currentRepoSlug} commit: ${gitCommitHash}`,
          branch: 'master',
        },
      }),
    })
    .then((response) => {
      console.log(`Triggered build of ${dependantRepoSlug}`);
      console.log(response.body);
    //   const respJSON = JSON.parse(response.body);
    //   return got.get(`https://api.travis-ci.org/repo/${respJSON.request.repository.id}/request/${respJSON.request.id}`, {
    //     headers: {
    //       "Content-Type": "application/json",
    //       "Accept": "application/json",
    //       "Travis-API-Version": "3",
    //       "Authorization": `token ${TOKEN}`,
    //     },
    // }).then((response)=>{
    //     console.log(response.body);
    //     const respJSON = JSON.parse(response.body);
    //     console.log(`https://travis-ci.org/${dependantRepo}/builds/${response.body.builds[0].id}`);
    //   });
    })
    .catch((err) => {
      console.error(err);

      process.exit(-1);
    });

});
