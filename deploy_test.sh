#!/bin/bash

# ANSI Color Codes
COLOR_RESET='\033[0m'
COLOR_GREEN='\033[0;32m'
COLOR_YELLOW='\033[0;33m'
COLOR_BLUE='\033[0;34m'
COLOR_RED='\033[0;31m'

# Function to ask for confirmation
confirm() {
    local prompt="$1"
    while true; do
        read -p "$(echo -e "${COLOR_YELLOW}${prompt} (y/n): ${COLOR_RESET}")" yn
        case $yn in
            [Yy]* ) return 0;; # Success (yes)
            [Nn]* ) return 1;; # Failure (no)
            * ) echo "Please answer yes (y) or no (n).";;
        esac
    done
}

echo -e "${COLOR_BLUE}--- Step 1: Finalize and Commit Code ---${COLOR_RESET}"
echo "Current Git status:"
git status
echo ""

if ! confirm "Are you satisfied with the changes listed above and ready to commit?"; then
    echo -e "${COLOR_RED}Aborted by user. Please stage and commit your desired changes manually.${COLOR_RESET}"
    exit 1
fi

# --- Git Add and Commit ---
echo -e "\n${COLOR_BLUE}Adding all current changes (git add .)...${COLOR_RESET}"
git add .

read -p "$(echo -e "${COLOR_YELLOW}Enter commit message: ${COLOR_RESET}")" COMMIT_MSG
if [ -z "$COMMIT_MSG" ]; then
    echo -e "${COLOR_RED}Commit message cannot be empty. Aborting.${COLOR_RESET}"
    exit 1
fi

echo -e "${COLOR_BLUE}Committing changes...${COLOR_RESET}"
git commit -m "$COMMIT_MSG"
if [ $? -ne 0 ]; then
    echo -e "${COLOR_RED}Git commit failed. Please check for errors. Aborting.${COLOR_RESET}"
    exit 1
fi
echo -e "${COLOR_GREEN}Code committed successfully.${COLOR_RESET}"

# --- Get Git SHA ---
echo -e "\n${COLOR_BLUE}Getting Git Commit SHA...${COLOR_RESET}"
GIT_SHA=$(git rev-parse --short HEAD)
if [ -z "$GIT_SHA" ]; then
    echo -e "${COLOR_RED}Failed to get Git Commit SHA. Aborting.${COLOR_RESET}"
    exit 1
fi
echo -e "Using Git Commit SHA: ${COLOR_GREEN}${GIT_SHA}${COLOR_RESET}"

# --- (Optional) Push to Remote ---
if confirm "\nDo you want to push the commit to the remote repository (origin)?"; then
    echo -e "${COLOR_BLUE}Pushing to remote origin...${COLOR_RESET}"
    git push origin $(git rev-parse --abbrev-ref HEAD) # Pushes the current branch
    if [ $? -ne 0 ]; then
        echo -e "${COLOR_RED}Git push failed. Please check for errors. You may need to resolve conflicts or pull first.${COLOR_RESET}"
        # Decide whether to abort or continue building locally
        if ! confirm "Git push failed. Continue building images locally anyway?"; then
             echo -e "${COLOR_RED}Aborted by user.${COLOR_RESET}"
             exit 1
        fi
    else
        echo -e "${COLOR_GREEN}Code pushed successfully.${COLOR_RESET}"
    fi
fi

echo -e "\n${COLOR_BLUE}--- Step 2: Build Pre-Release Docker Images ---${COLOR_RESET}"

if ! confirm "Ready to build Docker images for API and Web tagged with '${GIT_SHA}'?"; then
    echo -e "${COLOR_RED}Build process aborted by user.${COLOR_RESET}"
    exit 1
fi

# --- Get Image Prefix ---
echo -e "\nEnter a Docker image prefix (e.g., your Docker Hub username 'myuser',"
echo -e "or a full registry path like 'registry.example.com/myorg')."
echo -e "Leave blank if you only want to build images locally without pushing."
read -p "$(echo -e "${COLOR_YELLOW}Image Prefix (optional): ${COLOR_RESET}")" IMAGE_PREFIX

# Construct full image names
if [ -z "$IMAGE_PREFIX" ]; then
    API_IMAGE_FULL_NAME="dify-api:${GIT_SHA}"
    WEB_IMAGE_FULL_NAME="dify-web:${GIT_SHA}"
    API_IMAGE_NAME_FOR_ENV="dify-api" # Name used in .env file
    WEB_IMAGE_NAME_FOR_ENV="dify-web"
    echo -e "${COLOR_YELLOW}No prefix provided. Images will be built locally as '${API_IMAGE_FULL_NAME}' and '${WEB_IMAGE_FULL_NAME}'.${COLOR_RESET}"
else
    # Ensure prefix doesn't end with /
    IMAGE_PREFIX=$(echo "$IMAGE_PREFIX" | sed 's:/*$::')
    API_IMAGE_FULL_NAME="${IMAGE_PREFIX}/dify-api:${GIT_SHA}"
    WEB_IMAGE_FULL_NAME="${IMAGE_PREFIX}/dify-web:${GIT_SHA}"
    API_IMAGE_NAME_FOR_ENV="${IMAGE_PREFIX}/dify-api"
    WEB_IMAGE_NAME_FOR_ENV="${IMAGE_PREFIX}/dify-web"
    echo -e "Images will be built as '${API_IMAGE_FULL_NAME}' and '${WEB_IMAGE_FULL_NAME}'."
fi

# --- Build API Image ---
echo -e "\n${COLOR_BLUE}Building API image (${API_IMAGE_FULL_NAME})...${COLOR_RESET}"
if ! docker build -t ${API_IMAGE_FULL_NAME} -f ./api/Dockerfile ./api; then
    echo -e "${COLOR_RED}API image build failed. Please check the output above. Aborting.${COLOR_RESET}"
    exit 1
fi
echo -e "${COLOR_GREEN}API image built successfully.${COLOR_RESET}"

# --- Build Web Image ---
echo -e "\n${COLOR_BLUE}Building Web image (${WEB_IMAGE_FULL_NAME})...${COLOR_RESET}"
if ! docker build -t ${WEB_IMAGE_FULL_NAME} -f ./web/Dockerfile ./web; then
    echo -e "${COLOR_RED}Web image build failed. Please check the output above. Aborting.${COLOR_RESET}"
    exit 1
fi
echo -e "${COLOR_GREEN}Web image built successfully.${COLOR_RESET}"


echo -e "\n${COLOR_BLUE}--- Step 3: Push Images to Repository (Optional) ---${COLOR_RESET}"

PUSH_IMAGES=false
if [ -n "$IMAGE_PREFIX" ]; then
    if confirm "Do you want to push these images to the repository ('${IMAGE_PREFIX}')?"; then
        PUSH_IMAGES=true
    fi
else
    echo -e "${COLOR_YELLOW}Skipping push because no image prefix was provided.${COLOR_RESET}"
fi

if $PUSH_IMAGES; then
    echo -e "\n${COLOR_YELLOW}Please ensure you are logged in to your Docker registry ('docker login ...').${COLOR_RESET}"
    # --- Push API Image ---
    echo -e "\n${COLOR_BLUE}Pushing API image (${API_IMAGE_FULL_NAME})...${COLOR_RESET}"
    if ! docker push ${API_IMAGE_FULL_NAME}; then
        echo -e "${COLOR_RED}Failed to push API image. Check login status and repository permissions. Aborting push step.${COLOR_RESET}"
        # Decide if we should continue to configure .env
        if ! confirm "Push failed. Continue to configure .env.test anyway?"; then
            echo -e "${COLOR_RED}Aborted by user.${COLOR_RESET}"
            exit 1
        fi
        PUSH_IMAGES=false # Mark as failed to prevent pull later
    else
        echo -e "${COLOR_GREEN}API image pushed successfully.${COLOR_RESET}"
    fi

    # --- Push Web Image ---
    # Only push web if API push was successful or user opted to continue
    if $PUSH_IMAGES; then
         echo -e "\n${COLOR_BLUE}Pushing Web image (${WEB_IMAGE_FULL_NAME})...${COLOR_RESET}"
        if ! docker push ${WEB_IMAGE_FULL_NAME}; then
            echo -e "${COLOR_RED}Failed to push Web image. Check login status and repository permissions. Aborting push step.${COLOR_RESET}"
            if ! confirm "Push failed. Continue to configure .env.test anyway?"; then
                echo -e "${COLOR_RED}Aborted by user.${COLOR_RESET}"
                exit 1
            fi
            PUSH_IMAGES=false # Mark as failed to prevent pull later
        else
            echo -e "${COLOR_GREEN}Web image pushed successfully.${COLOR_RESET}"
        fi
    fi
fi


echo -e "\n${COLOR_BLUE}--- Step 4: Configure Test Environment (.env.test) ---${COLOR_RESET}"

DOCKER_DIR="./docker"
ENV_FILE="${DOCKER_DIR}/.env.test"

if ! confirm "Ready to create/overwrite the test environment configuration file '${ENV_FILE}'?"; then
    echo -e "${COLOR_RED}Configuration aborted by user.${COLOR_RESET}"
    exit 1
fi

# Create docker directory if it doesn't exist (optional, good practice)
mkdir -p "$DOCKER_DIR"

echo -e "${COLOR_BLUE}Generating ${ENV_FILE}...${COLOR_RESET}"
# Use heredoc to write the .env.test file
# WARNING: This will overwrite the existing file!
cat << EOF > "$ENV_FILE"
# Test Environment Configuration generated by deploy_test.sh
# !!! REVIEW AND EDIT THIS FILE CAREFULLY BEFORE DEPLOYING !!!

# --- Core: Image Specification ---
API_IMAGE_NAME=${API_IMAGE_NAME_FOR_ENV}
WEB_IMAGE_NAME=${WEB_IMAGE_NAME_FOR_ENV}
API_IMAGE_TAG=${GIT_SHA}
WEB_IMAGE_TAG=${GIT_SHA}

# --- Infrastructure Settings (EDIT THESE!) ---
# Replace with your actual test database credentials if different
DB_HOST=db
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=difyai123456 # USE A SECURE TEST PASSWORD
DB_DATABASE=dify_test    # Recommended: use a separate DB for testing

# Replace with your actual test Redis credentials if different
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=difyai123456 # USE A SECURE TEST PASSWORD
REDIS_DB=1                  # Recommended: use a separate DB for testing
CELERY_BROKER_URL=redis://:\${REDIS_PASSWORD:-difyai123456}@\${REDIS_HOST:-redis}:\${REDIS_PORT:-6379}/1 # Check Redis DB number

# --- Vector Store Settings (EDIT based on your choice!) ---
VECTOR_STORE=weaviate # Or qdrant, milvus, etc.
WEAVIATE_ENDPOINT=http://weaviate:8080
WEAVIATE_API_KEY=WVF5YThaHlkYwhGUSmCRgsX3tD5ngdN8pkih # Use the correct key

# --- Application URLs (VERY IMPORTANT - EDIT THESE!) ---
# Set these based on how you access your *TEST* environment
CONSOLE_WEB_URL=http://localhost:80 # Example: Access via Nginx on host port 80
APP_WEB_URL=http://localhost:80
CONSOLE_API_URL=http://localhost:80/console/api # Assumes Nginx proxy pass
SERVICE_API_URL=http://localhost:80/service/api
APP_API_URL=http://localhost:80/app/api
FILES_URL=http://localhost:80/files

# --- General Settings (EDIT THESE!) ---
SECRET_KEY=replace_this_with_a_strong_random_key_for_testing # Generate a new random key!
DEPLOY_ENV=STAGING
LOG_LEVEL=DEBUG
FLASK_DEBUG=false
DEBUG=false

# --- Nginx Settings (EDIT THESE!) ---
EXPOSE_NGINX_PORT=80
EXPOSE_NGINX_SSL_PORT=443
NGINX_SERVER_NAME=localhost # Or your test domain
NGINX_HTTPS_ENABLED=false   # Set to true if using HTTPS for testing

# --- Other Services (Add API keys, Mail settings, etc. as needed) ---
# OPENAI_API_KEY=...
# MAIL_TYPE=...
# SMTP_SERVER=...

EOF

echo -e "${COLOR_GREEN}${ENV_FILE} created/updated successfully.${COLOR_RESET}"
echo -e "${COLOR_YELLOW}!!! IMPORTANT: Please open '${ENV_FILE}' in your editor NOW. !!!${COLOR_RESET}"
echo -e "${COLOR_YELLOW}Review all settings, especially URLs, database/redis details, and SECRET_KEY.${COLOR_RESET}"
echo -e "${COLOR_YELLOW}Make any necessary edits before proceeding to deployment.${COLOR_RESET}"


echo -e "\n${COLOR_BLUE}--- Step 5: Deploy to Test Environment ---${COLOR_RESET}"

if ! confirm "Have you reviewed and edited the '${ENV_FILE}' file?"; then
    echo -e "${COLOR_RED}Deployment aborted by user. Please review the file.${COLOR_RESET}"
    exit 1
fi

if ! confirm "Ready to deploy the test environment using 'docker-compose up -d'?"; then
    echo -e "${COLOR_RED}Deployment aborted by user.${COLOR_RESET}"
    exit 1
fi

# Change to the docker directory
cd "$DOCKER_DIR" || { echo -e "${COLOR_RED}Failed to change directory to $DOCKER_DIR. Aborting.${COLOR_RESET}"; exit 1; }

# Optional: Pull images if they were pushed
if $PUSH_IMAGES; then
    if confirm "Do you want to pull the latest images ('${GIT_SHA}') from the repository first?"; then
        echo -e "\n${COLOR_BLUE}Pulling images from repository...${COLOR_RESET}"
        if ! docker-compose -f docker-compose.yaml --env-file .env.test pull api web; then
             echo -e "${COLOR_RED}Failed to pull images. Check repository access and image tags. Aborting deployment.${COLOR_RESET}"
             cd .. # Go back to original directory before exiting
             exit 1
        fi
        echo -e "${COLOR_GREEN}Images pulled successfully.${COLOR_RESET}"
    fi
fi

# Deploy using docker-compose
echo -e "\n${COLOR_BLUE}Starting test environment deployment (docker-compose up -d)...${COLOR_RESET}"
if ! docker-compose -f docker-compose.yaml --env-file .env.test up -d; then
    echo -e "${COLOR_RED}Deployment failed. Check the output from docker-compose above.${COLOR_RESET}"
    cd .. # Go back
    exit 1
fi

# Go back to the original directory
cd ..

echo -e "\n${COLOR_GREEN}--- Deployment Initiated Successfully! ---${COLOR_RESET}"
echo -e "The test environment is starting up in the background."
echo -e "You can check the logs using: ${COLOR_YELLOW}cd ./docker && docker-compose -f docker-compose.yaml --env-file .env.test logs -f${COLOR_RESET}"
echo -e "Access the application at the URL configured in '${ENV_FILE}' (e.g., http://localhost:80)."
echo -e "${COLOR_BLUE}Remember to run your tests against this environment.${COLOR_RESET}"

exit 0