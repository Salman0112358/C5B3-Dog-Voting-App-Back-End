
function splitBredd(breed) {


    if (breed.indexOf("-") > -1) {
        const splitBreed = breed.split("-"); //hound-ddfdsfs
        const mainBreed = splitBreed[0]; //hound
        const subBreed = splitBreed[1];

        return [mainBreed,subBreed]
    } else {
        return "whoops"
    }

    
}

console.log("expect result of : [hound, bigboy] ", splitBredd("hound-bigboy"));