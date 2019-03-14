describe('Simple navigation', () => {
    it('right', done => {
        for(var i = 0; i < 5; i++)
            action.right()
        setTimeout(
            () =>
                done(
                    frame.t0.equals( 6000) &&
                    frame.tn.equals(26000) &&
                    frame.min.equals(   0) &&
                    frame.max.equals(  15) &&
                    frame.norm.equals( 15) &&
                    frame.index_first === 0  &&
                    frame.index_last === 2
                        ? undefined
                        : 'ddd'
                )
            ,
            1000
        )
    })

    it('left', done => {
        for(var i = 0; i < 5; i++)
            action.left()
        setTimeout(
            () =>
                done(
                    frame.t0.equals( 1000) &&
                    frame.tn.equals(21000) &&
                    frame.min.equals(   5) &&
                    frame.max.equals(  15) &&
                    frame.norm.equals( 10) &&
                    frame.index_first === 0  &&
                    frame.index_last === 1
                        ? undefined
                        : 'ddd'
                )
            ,
            1000
        )
    })
})
