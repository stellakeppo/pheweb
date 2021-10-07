#!/bin/bash -x
set -e
set -x

PROJECT_DIR=$1
test -d "$PROJECT_DIR" || exit 1

INVENTORY_CATALOG=$2
test -f "$INVENTORY_CATALOG" || exit 1

PHEWEB_ROOT=$(pwd)
export PHEWEB_ROOT

PYTHONPATH=$(pwd):$PYTHONPATH
export PYTHONPATH

cd "$PROJECT_DIR"
[ -d "generated-by-pheweb" ] && rm -rf generated-by-pheweb
mkdir -p generated-by-pheweb/{pheno,parsed,sites,manhattan,qq,pheno_gz}

ALL_PHENOS=()

PHENO_LIST=()

PHONO_LIST_TMP_FILE="pheno-list-$$.json"
echo "[" > "$PHONO_LIST_TMP_FILE"

LC=$(wc -l < "$INVENTORY_CATALOG")

while IFS= read -r INVENTORY_ITEM
do

    LC=$((LC-1))
    IFS=, read BUCKET_PATH PHENOSTRING CASES_CONTROL <<< $INVENTORY_ITEM

    IFS=";" read CASES CONTROL <<< $CASES_CONTROL
    NUM_CASES=${CASES%% *}
    NUM_CONTROL=${CONTROL%% *}
    
    FILE_NAME=$(basename "$BUCKET_PATH")
    PHENOCODE=$(echo $PHENOSTRING | sed 's/.*(\(.*\))/\1/')
    CATEGORY=$PHENOCODE
    ASSOC_FILE=$(realpath "generated-by-pheweb/parsed/$PHENOCODE")

    TEMPLATE='
    { assoc_files: [ $assoc_files ] , 
      phenocode: $phenocode ,
      category: $category ,
      phenostring: $phenostring,
      gc_lambda: { "0.001": $gc_lambda_001 ,
                   "0.01":  $gc_lambda_01,
                   "0.1":   $gc_lambda_1,
                   "0.5":   $gc_lambda_5 },
      num_cases:  $num_cases,
      num_controls: $num_controls }'
    
    PHENO_ENTRY=$(jq -n \
		     --arg assoc_files "$ASSOC_FILE" \
		     --arg phenocode "$PHENOCODE" \
		     --arg category "$CATEGORY" \
		     --arg phenostring "$PHENOSTRING" \
		     --arg gc_lambda_001 0 \
		     --arg gc_lambda_01 0 \
		     --arg gc_lambda_1 0 \
		     --arg gc_lambda_5 0 \
		     --arg num_cases "$NUM_CASES" \
		     --arg num_controls "$NUM_CONTROL" \
		     "$TEMPLATE" )
    echo "$PHENO_ENTRY" >> "$PHONO_LIST_TMP_FILE"
    if (( $LC > 0 )); then
      echo " , " >> "$PHONO_LIST_TMP_FILE"
    fi

    gsutil cat "$BUCKET_PATH" | \
	zcat | \
	sed '1 s/#CHR/chrom/ ; 1 s/POS/pos/ ; 1 s/#CHR/chrom/ ; 1 s/POS/pos/ ; 1 s/REF/ref/ ; 1 s/ALT/alt/ ; 1 s/SNP/snp/ ; 1 s/inv_var_meta_p/pval/ ; 1 s/inv_var_meta_beta/beta/ ; 1 s/inv_var_meta_sebeta/sebeta/ ' | \
	awk -F"\t" '{ if($15 > 1) { print }}' | awk -F"\t"  ' { t = $5; $5 = $9; $9 = t; print; } ' OFS=$'\t' | \
	tee >(cut -d$'\t'   -f1-3 >> generated-by-pheweb/sites/sites.tsv.dup ) \
	    >( sed '1 s/chrom/#chrom/ ; 1 s/rsid/rsids/ ; ' > generated-by-pheweb/pheno_gz/${PHENOCODE} )  > "$ASSOC_FILE"
    printf '%s\t%s\t%s\t%s\t%s\n' "$PHENOCODE" "$PHENOSTRING" "$NUM_CASES" "$NUM_CONTROL" "$ASSOC_FILE"  >> generated-by-pheweb/pheno_config.txt
    ( bgzip generated-by-pheweb/pheno_gz/${PHENOCODE} ;
      tabix -S 1 -b 2 -e 2 -s 1 generated-by-pheweb/pheno_gz/${PHENOCODE}.gz )&
    
    ALL_PHENOS+=("$PHENOCODE")
    
done < "$INVENTORY_CATALOG"
echo "]" >> "$PHONO_LIST_TMP_FILE"

cat generated-by-pheweb/sites/sites.tsv.dup | sort -t$'\t' -k1,1n -k2,2n -k3,3 | uniq > generated-by-pheweb/sites/sites.tsv

# check and do the exact same as
#  wdl/import.wdl
pheweb phenolist glob ./generated-by-pheweb/parsed/*
pheweb phenolist extract-phenocode-from-filepath --simple

pheweb sites
pheweb make-gene-aliases-trie
pheweb add-rsids
pheweb add-genes
pheweb make-cpras-rsids-sqlite3
pheweb make-gene-aliases-sqlite3

pheweb augment-phenos
pheweb manhattan

sed '1d' generated-by-pheweb/sites/sites.tsv > generated-by-pheweb/sites/sites.tsv.noheader
python3 "$PHEWEB_ROOT/pheweb/load/external_matrix.py" \
       generated-by-pheweb/pheno_config.txt \
       generated-by-pheweb/ \
       generated-by-pheweb/sites/sites.tsv.noheader \
       --chr chrom --pos pos --ref ref --alt alt \
       --all_fields \
       --no_require_match \
       --no_tabix 



bgzip generated-by-pheweb/matrix.tsv
tabix -S 1 -b 2 -e 2 -s 1 generated-by-pheweb/matrix.tsv.gz

pheweb gather-pvalues-for-each-gene

for PHENOCODE in "${ALL_PHENOS[@]}"
do
    mv generated-by-pheweb/parsed/$PHENOCODE generated-by-pheweb/pheno/$PHENOCODE
done

pheweb qq
mv $PHONO_LIST_TMP_FILE pheno-list.json

# for PHENOCODE in "${ALL_PHENOS[@]}"
# do
#     bgzip generated-by-pheweb/pheno_gz/${PHENOCODE}
#     tabix -S 1 -b 2 -e 2 -s 1 generated-by-pheweb/pheno_gz/${PHENOCODE}.gz
# done
