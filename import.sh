#!/bin/bash -x
set -e

export PHEWEB_ROOT=`pwd`
export PYTHONPATH=`pwd`:$PYTHONPATH
cd /mnt/nfs_dev/pheweb/metaextension
[ -d "generated-by-pheweb" ] && rm -rf generated-by-pheweb
FILE=Z21_PRESENCE_OTH_DEVICES_meta_out
mkdir -p generated-by-pheweb/{pheno,parsed,sites,manhattan,qq,pheno_gz}
cp /mnt/nfs_dev/pheweb/r6/generated-by-pheweb/sites/sites.tsv generated-by-pheweb/sites/sites.tsv
gsutil cat gs://finngen-production-library-green/finngen_R6/finngen_R6_analysis_data/ukbb_meta/$FILE.tsv.gz | zcat | awk -F"\t" '{ if($20 != "NA") { print }}' | head -n 100000 > generated-by-pheweb/parsed/$FILE
echo $FILE | awk '{print $1 "\t" $1 "\t" $1 "\t" $1 "\t" $1 "\t" $1}' > generated-by-pheweb/pheno_config.txt
pheweb map-fields --rename '#CHR:chrom,POS:pos,REF:ref,ALT:alt,SNP:snp,all_inv_var_meta_p:pval,all_inv_var_meta_beta:beta,all_inv_var_meta_sebeta:sebeta' --exclude snp generated-by-pheweb/parsed/$FILE
awk 'BEGIN {FS=OFS="\t"}{t=$19;$19=$4;$4=t;print}' generated-by-pheweb/parsed/$FILE > /tmp/$FILE
mv /tmp/$FILE generated-by-pheweb/parsed/$FILE
cat generated-by-pheweb/parsed/$FILE | sed '1 s/chrom/#chrom/' | bgzip > generated-by-pheweb/pheno_gz/$FILE.gz
tabix -S 1 -b 2 -e 2 -s 1 generated-by-pheweb/pheno_gz/$FILE.gz
cd generated-by-pheweb/parsed
python3 $PHEWEB_ROOT/pheweb/load/external_matrix.py \
       ../pheno_config.txt \
       ../ \
       /mnt/nfs_dev/pheweb/r6_test/generated-by-pheweb/sites/sites.tsv.noheader \
       --chr 'chrom' --pos pos --ref ref --alt alt \
       --all_fields \
       --no_require_match \
       --no_tabix 
cd ../..
cat generated-by-pheweb/matrix.tsv | sed '1 s/#chr/#chrom/' | bgzip -c > generated-by-pheweb/matrix.tsv.gz
rm generated-by-pheweb/matrix.tsv

tabix -S 1 -b 2 -e 2 -s 1 generated-by-pheweb/matrix.tsv.gz
pheweb phenolist glob ./generated-by-pheweb/parsed/*
pheweb phenolist extract-phenocode-from-filepath --simple
pheweb augment-phenos
pheweb manhattan

pheweb sites
pheweb make-gene-aliases-trie
pheweb add-rsids
pheweb add-genes
pheweb make-tries

mv generated-by-pheweb/parsed/$FILE \
   generated-by-pheweb/pheno/$FILE
pheweb qq

cat pheno-list.json | jq '.[0]|= . + {"finngen_cases": 3846, "finngen_controls": 231085, "ukb_cases": 1458, "ukb_controls": 419073, "atc": "A02BC", "category": "ATC", "gc_lambda": { "0.001": 1.5995, "0.01": 1.3785, "0.1": 1.2893, "0.5": 1.2449 }, "num_gw_significant": 43, "num_samples": 173827, "phenostring": "Z21 PRESENCE OTH DEVICES" }' > pheno-list.json.1.bkup
mv pheno-list.json.1.bkup pheno-list.json
