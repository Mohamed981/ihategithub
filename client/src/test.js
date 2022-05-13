
const tick = Date.now();
const log = (v) => console.log(`${v} \n Elapsed: ${Date.now() - tick}ms`);

const code =()=>{
    return Promise.resolve().then(v=>{
        let i=0;
        while(i<1000000000){
            i++;
        }
       return 'billion';
    })
}


log('sync 1');
// code().then(log);
setTimeout(()=>console.log('ss'),1000);
log('sync 2');

