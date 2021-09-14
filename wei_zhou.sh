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
mkdir -p generated-by-pheweb/{pheno,parsed,sites,manhattan,qq}
cp /mnt/nfs_dev/pheweb/r6/generated-by-pheweb/sites/sites.tsv generated-by-pheweb/sites/sites.tsv
cp /mnt/nfs_dev/pheweb/r6/generated-by-pheweb/sites/sites-unannotated.tsv generated-by-pheweb/sites/sites-unannotated.tsv
cp /mnt/nfs_dev/pheweb/r6_test/generated-by-pheweb/sites/sites.tsv.noheader generated-by-pheweb/sites/sites.tsv.noheader

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
    ASSOC_FILE=$(realpath "generated-by-pheweb/parsed/$PHENOCODE")

    TEMPLATE='
    { assoc_files: [ $assoc_files ] , 
      phenocode: $phenocode ,
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

    gsutil cat "$BUCKET_PATH" | zcat | awk -F"\t" '{ if($15 > 1) { print }}' | head -n 100 > "$ASSOC_FILE"
    #gsutil cat "$BUCKET_PATH" | zcat | awk -F"\t" '{ if($15 > 1) { print }}' > "$ASSOC_FILE"

    echo "$ASSOC_FILE" | awk '{print $1 "\t" $1 "\t" $1 "\t" $1 "\t" $1 "\t" $1}' >> generated-by-pheweb/pheno_config.txt
    pheweb map-fields --rename '#CHR:chrom,POS:pos,REF:ref,ALT:alt,SNP:snp,inv_var_meta_p:pval,all_inv_var_meta_beta:beta,all_inv_var_meta_sebeta:sebeta' "$ASSOC_FILE"

    ALL_PHENOS+=("$PHENOCODE")
    
done < "$INVENTORY_CATALOG"
echo "]" >> "$PHONO_LIST_TMP_FILE"

# check and do the exact same as
#  wdl/import.wdl
pheweb phenolist glob ./generated-by-pheweb/parsed/*
pheweb phenolist extract-phenocode-from-filepath --simple

pheweb sites
pheweb make-gene-aliases-tries
pheweb add-rsids
pheweb add-genes
pheweb make-cpras-rsids-sqlite3
pheweb make-gene-aliases-sqlite3
read


pheweb augment-phenos
pheweb manhattan

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


for PHENOCODE in "${ALL_PHENOS[@]}"
do
    mv generated-by-pheweb/parsed/$PHENOCODE generated-by-pheweb/pheno/$PHENOCODE
done

pheweb qq
