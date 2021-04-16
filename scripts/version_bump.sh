#! /bin/bash
version=`git describe --tags $(git rev-list --tags --max-count=1)`

if [ "$version" != "" ]; then
    sed -i -e "s/0.0.0/$version/g" package.json
    echo "Created a new tag, $version"
fi
