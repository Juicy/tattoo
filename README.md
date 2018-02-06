# tattoo
Naive script to Test All The Things Over &amp; Over

> Inspired by [Polymer/tattoo](https://github.com/Polymer/tattoo)

This is naive script to run more builds after your build finished successfully.

## Installation

```
npm install juicy-tattoo
```
Consider saving it to your `package.json` with `--save`, or calling it in your `.travis.yml`:
```
before_script:
- npm install juicy-tattoo
```

## Setup

 0. Make sure all your repos have travis builds up and running correctly
 1. Generate a Travis token as described here:  https://docs.travis-ci.com/user/triggering-builds
 2. Secure it and add to your `.travis.yml` using `travis encrypt TRAVIS_API_TOKEN=... --add`
 3. Add script to your `travis.yml`
     ```yml
     after_success:
     - juicy-tattoo
     ```
 4. Create `test/tattoo.json` file to point to your dependants:
    ```json
    {
      "name": "YourOrg/YourRepo",
      "dependants": [
        "DependantOrg/DependantRepo"
        ...
       ]
    }
    ```
  

### Usage

Push your changes to the repo, and travis should trigger other builds as well.
