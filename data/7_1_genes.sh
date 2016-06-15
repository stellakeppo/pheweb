#!/bin/bash

set -euo pipefail

PROJECT_DIR="$( cd "$( dirname "$( dirname "$(readlink -f "${BASH_SOURCE[0]}" )" )" )" && pwd )"
source "$PROJECT_DIR/config.config"

mkdir -p "$data_dir/genes/"

if ! [[ -e "$data_dir/genes/genes.bed" ]]; then

    if ! [[ -e "$data_dir/genes/gencode.gtf.gz" ]]; then
        # Link from <http://www.gencodegenes.org/releases/19.html>
        wget -O "$data_dir/genes/genocode.gtf.gz" "ftp://ftp.sanger.ac.uk/pub/gencode/Gencode_human/release_19/gencode.v19.annotation.gtf.gz"
    fi

    # TODO: these mostly have `gene_type` of `protein_coding`, `pseudogene`, `lincRNA`, `antisense`, or `miRNA`.  Should I filter on that category?
    gzip -cd "$data_dir/genes/genocode.gtf.gz" |
    perl -F'\t' -nale 'print "$F[0]\t$F[3]\t$F[4]\t", m{gene_name "(.*?)";} if $F[2] eq "gene"' |
    # Bedtools expects chromosomes to be in lexicographic order.
    bedtools sort -i \
    > "$data_dir/genes/genes.bed"
fi

echo done!
