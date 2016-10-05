#!/bin/bash
{
set -eu
PROJECT_DIR="$( cd "$( dirname "$( dirname "$(readlink -f "${BASH_SOURCE[0]}" )" )" )" && pwd )"
source "$PROJECT_DIR/config.config"
set -x

./phenolist.py glob-files "/net/wonderland/home/csidore/Epacts_vcfs/Michelle_panel/GOODheader/R2sameasPapers/out-*/epacts-*.epacts.gz"
./phenolist.py extract-phenocode-from-fname 'epacts-(.*)\.epacts\.gz'

./phenolist.py read-info-from-association-files

./phenolist.py verify
}
