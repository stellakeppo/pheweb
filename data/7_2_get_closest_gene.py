#!/usr/bin/env python2

from __future__ import print_function, division, absolute_import

import os.path

# Activate virtualenv
my_dir = os.path.dirname(os.path.abspath(__file__))
activate_this = os.path.join(my_dir, '../../venv/bin/activate_this.py')
execfile(activate_this, dict(__file__=activate_this))

import sys
sys.path.insert(0, os.path.join(my_dir, '..'))
from utils import round_sig, parse_marker_id

execfile(os.path.join(my_dir, '../config.config'))


import pybedtools


chrom = sys.argv[1]
pos = int(sys.argv[2])

# There's probably an off-by-one error here somewhere.  Who knows. I don't care.
variant_bed = pybedtools.BedTool('{} {} {}'.format(chrom, pos, pos+1), from_string=True)
genes_bed = pybedtools.BedTool(data_dir + '/genes/genes.bed')

# The `-D ref` option reports distance from the variant to the gene.
# It's positive if the gene is after the variant.
# It's negative if the gene is before the variant.
closest = variant_bed.closest(genes_bed, D='ref')
assert len(closest) >= 1 # eg, chr9:114173990 overlaps two genes
assert all(match.fields[0] == match.fields[3] for match in closest)
if len(closest) > 1:
    assert all(int(match.fields[7]) == 0 for match in closest)

print(','.join(match.fields[6] for match in closest))
