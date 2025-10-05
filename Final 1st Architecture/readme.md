For Build :
docker build --no-cache -t hdf5 .      

For Run :
docker run --rm --entrypoint sh -v "$PWD/input:/app/input" -v "$PWD/output:/app/output" hdf5 -c "/app/hdf5_to_cog --outdir /app/output /app/input/*.h5"