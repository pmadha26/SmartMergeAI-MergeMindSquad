# Call-Center-Return

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 11.2.13.

## Build Status

- **develop** [![Build Status](https://v3.travis.ibm.com/Order-Management-Fulfillment/cc-return.svg?token=pFFMUPMioG7dSqit4xPx&branch=develop)](https://v3.travis.ibm.com/Order-Management-Fulfillment/cc-return)

- **master** [![Build Status](https://v3.travis.ibm.com/Order-Management-Fulfillment/cc-return.svg?token=pFFMUPMioG7dSqit4xPx&branch=master)](https://v3.travis.ibm.com/Order-Management-Fulfillment/cc-return)


## Development server

Create a file `overrides.json` in the workspace with the following content:
```
{
    "routes": {
        "return-search": {
            "useProd": false
        },
        "return-details": {
            "useProd": false
        },
        "return-search-result": {
            "useProd": false
        },
        "create-return": {
            "useProd": false
        },
        "return-modification-checkout": {
            "useProd": false
        },
        "manage-return-holds": {
            "useProd": false
        }
    }
}
```

Run `yarn start-app`

## Development environment with shell-onprem

1. login to wce-buc-apps-docker-local.artifactory.swg-devops.com  
    ```
    docker login -p $(echo $ARTIFACTORY_API_KEY | base64 -d) -u $ARTIFACTORY_USERNAME wce-buc-apps-docker-local.artifactory.swg-devops.com
    ```

2. Pull and run the latest `om-call-center-base` docker image:
    Pull the image - it can be a one time task though
    ```
    docker pull wce-buc-apps-docker-local.artifactory.swg-devops.com/call-center/develop/om-call-center-base:latest
    ```
    Run using this command:
    ```
    docker run -p 7443:7443 \
        -e "ADMIN_TOOL_URL=https://om-app-server:9443" \
        -e "MASHUP_ORIGIN=https://mashup-server:port" \
        -e "DEV_MODE=true" \ 
        -d --name om-call-center-base \
        wce-buc-apps-docker-local.artifactory.swg-devops.com/call-center/develop/om-call-center-base:latest
    ```
    Note : MASHUP_ORIGIN should be https://loalhost:7443

 3. _Alternate approach to docker (step 1 and 2)_: Run the [shell-on-prem](https://github.ibm.com/WCI/shell-on-prem) repo locally with the following changes (no need to setup mashup war).
    - a) Set/export environment variables `OMS_API_ENDPOINT` and `MASHUP_API_ENDPOINT` with approproate values before starting shell-on-prem locally
 	
    - b) Open the features.json file in  `/src/assets/callCenter/features.json`

    - c) Follow steps 4 and 5 and skip to step 6c
 
 4. Run the [cc-hub](https://github.ibm.com/Order-Management-Fulfillment/cc-hub) repo locally. Accept the certificate for [https://localhost:9000/call-center-hub](https://localhost:9000/call-center-hub)  
 
 5. Start cc-return locally: 
	  ```
    yarn start-app --overrides-json overrides.json
    ``` 
    
    Accept the certificate for [https://localhost:6100/call-center-return](https://localhost:6100/call-center-return)
 
 6. Modify the features.json inside the `om-call-center-base` docker container. This is a one-time step, unless you are adding a new feature to the shell's left navigation.
    - a) Open a terminal in the docker container:  
        ``` 
        docker exec -it om-call-center-base bash
        ```
    - b) Open the features.json  
        ```
        vi /opt/app-root/src/shell-ui/assets/features.json
        ```
    - c) Modify the link property of each feature in the features array. Replace the leading `/` with `https://localhost:9000/`.
   
    	E.g: `/call-center-hub/home` would become `https://localhost:9000/call-center-hub/home`
      
    - d) Save the file.

    - e) Add proxy for mashup server.
        ```
        cd /opt/app-root/etc/nginx.d
        vi default.conf
        ```
        
        Add the location entry below after replacing localhost-ip with IP address of localhost

        location /icc {
         proxy_pass `http://<localhost-ip>:9080`;
        }

        Example : 
        
        location /call-center {
         alias /opt/app-root/src/shell-ui;
         try_files $uri /index.html index.html =404;
        }

        location /icc {
         proxy_pass http://192.168.0.102:9080;
        }

     - f) restart container
       ``` 
       docker restart om-call-center-base 
        ```
 
 7. Launch the on-prem shell: 
    - If running via docker (steps 1 and 2): [https://localhost:7443/call-center](https://localhost:7443/call-center)
    - If running shell-on-prem locally (step 3): [https://localhost:4200/call-center](https://localhost:4200/call-center)

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `yarn build-develop` to build the project. The build artifacts will be stored in the `dist/` directory. Use the `--prod` flag for a production build.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via [Protractor](http://www.protractortest.org/).

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.io/cli) page.
