#!/bin/bash

BUCKET="cjwinfield" # bucket name
FILENAME="release.zip" # upload key
OUTPUT_FOLDER="./build" # will be cleaned

HERE=${BASH_SOURCE%/*} # relative path to this file's folder
OUTPUT_FILE="$OUTPUT_FOLDER/$FILENAME"

# create target folders
mkdir $OUTPUT_FOLDER

# zip everything to output folder (recursively and quietly)
echo "zipping project"
zip --exclude \*.git\* Makefile deploy.sh \*.yml\* \*.zip\* \*.css\* event.json -r $OUTPUT_FILE .


# # upload to S3
echo "Uploading to S3"
aws s3 cp --acl public-read $OUTPUT_FILE s3://$BUCKET/$FILENAME
echo "https://s3.amazonaws.com/$BUCKET/$FILENAME"

# clean everything
echo "Cleaning"
rm -rf $OUTPUT_FOLDER

aws lambda update-function-code

aws lambda update-function-code --function-name pdfGenerator --s3-bucket "${BUCKET}" --s3-key "${FILENAME}"
echo "Done"