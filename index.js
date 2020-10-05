class MySequelize {
    constructor(connect, tableName) {
        this.connection = connect;
        this.table = tableName;
    }

    async create(obj) {
        await this.connection.query(
            `INSERT INTO ${this.table} SET ?`,
            obj,
            (err, res) => {
                if (err) throw err;
            }
        );
        /*
           Model.create({
               name: 'test',
               email: 'test@gmail.com',
               password: '123456789',
               is_admin: false
           })
        */
    }

    async bulkCreate(arr) {
        for (let i = 0; i < arr.length; i++) {
            await this.connection.query(
                `INSERT INTO ${this.table} SET ?`,
                arr[i],
                (err, res) => {
                    if (err) throw err;
                }
            )
        }

        /*
           Model.bulkCreate([
               {
               name: 'test',
               email: 'test@gmail.com',
               password: '123456789',
               is_admin: false
           },
           {
               name: 'test1',
               email: 'test1@gmail.com',
               password: '123456789',
               is_admin: false
           },
           {
               name: 'test2',
               email: 'test2@gmail.com',
               password: '123456789',
               is_admin: true
           },
        ])
        */
    }

    optionOpener(options) {
        let queryString;
        if (options) {

            let join = "";
            if (options.include) {
                options.include.forEach(i => {
                    join += `JOIN ${i.table}
                ON ${i.table + "." + i.tableForeignKey} = ${this.table + "." + i.sourceForeignKey}`
                });
            }

            let attributes = join ? this.table + ".*" : "*";
            if (options.attributes) {
                attributes = "";
                for (let i = 0; i < options.attributes.length; i++) {
                    if (join) {
                        attributes += this.table + "."
                    }
                    attributes += typeof options.attributes[i] === "object" ? options.attributes[i].join(" AS ") : options.attributes[i];
                    attributes += ",";
                }
                attributes = attributes.slice(0, attributes.length - 1)
            }

            let orderBy = join ? this.table + "." : ""
            orderBy += options.order ? options.order.join(' ') : 'id ASC';
            const limit = options.limit;

            const whereKeys = options.where ? Object.keys(options.where) : [];
            const whereValues = options.where ? Object.values(options.where) : [];
            let where = 'true ';
            for (let i = 0; i < whereKeys.length; i++) {
                where += `AND ${whereKeys[i]} = ${typeof whereValues[i] === "string" ? `"${whereValues[i]}"` : whereValues[i]}`
            }
            queryString = `SELECT ${attributes}
            FROM ${this.table}
            ${join}
            WHERE ${where}
            ORDER BY ${orderBy}
            ${limit ? `LIMIT ${limit}` : ""}
            `
        }
        else {
            queryString = `SELECT * FROM ${this.table}`
        }
        return queryString
    }

    async findAll(options) {

        let results = await this.connection.query(
            this.optionOpener(options)
        )
        if (options) {
            if (options.include) {
                let resultPlusINclude = await Promise.all(
                    results[0].map(async (obj) => {
                        const joiner = await this.connection.query(
                            `SELECT * FROM ${options.include[0].table
                            } WHERE ${options.include[0].tableForeignKey}=${obj[options.include[0].sourceForeignKey]
                            }`
                        );
                        obj[options.include[0].table] = joiner[0];
                        return obj;
                    })
                );
                return resultPlusINclude;
            }
        }
        return results[0];
        /*
        Model.findAll({
            include:[
                {
                    table: playlists,             // table yo want to join
                    tableForeignKey: "creator",   // column reference in the table yo want to join
                    sourceForeignKey: "id",       // base table column reference
                }
            ] 
        })
        */

        /*
        Model.findAll({
            where: {
                is_admin: false
            },
            order: ['id', 'DESC'],
            limit 2
        })
        */


        /*
        Model.findAll({
            where: {
                [Op.gt]: {
                    id: 10
                },                // both [Op.gt] and [Op.lt] need to work so you can pass the tests
                [Op.lt]: {        
                    id: 20
                }
        })
        */
    }

    async findByPk(id) {
        const results = await this.connection.query(
            `SELECT *
            FROM ${this.table}
            WHERE id = ${id}`
        )
        return results[0]
        /*
        Model.findByPk(id)
    */
    }

    async findOne(options) {
        const results = await this.connection.query(
            this.optionOpener(options) + " LIMIT 1"
        )

        return results[0]
        /*
            Model.findOne({
                where: {
                    is_admin: true
                }
            })
        */
    }

    async update(newDetsils, options) {
        let whereClause = "";
        if (options.where) {
            let opUsed = Reflect.ownKeys(options.where); // All keys including symbols
            whereClause = " WHERE ";
            //Creating an array containing trios of [key,value,operator]
            let keyValuesOp = opUsed.map((op) =>
                typeof op === "symbol"
                    ? [Object.entries(options.where[op]), Symbol.keyFor(op)].flat(2)
                    : [op, options.where[op], "="]
            );
            //Converting the array into sql clause: for[id,5,>]->id>5
            whereClause += keyValuesOp
                .map(
                    (trio) =>
                        `${trio[0]}${trio[2]}${isNaN(trio[1]) ? `'${trio[1]}'` : trio[1]
                        } AND`
                )
                .join(" ")
                .slice(0, -3);
        }

        await this.connection.query(
            `UPDATE ${this.table} SET ? ${whereClause}`, newDetsils
        )
        /*
            Model.update( { name: 'test6', email: 'test6@gmail.com' } , {
                where: {                                                      // first object containing details to update
                    is_admin: true                                            // second object containing condotion for the query
                }
            })
        */
    }

    async destroy({ force, ...options }) {
        const whereKeys = options.where ? Object.keys(options.where) : [];
        const whereValues = options.where ? Object.values(options.where) : [];
        let where = "";
        for (let i = 0; i < whereKeys.length; i++) {
            where += `AND ${whereKeys[i]} = ${typeof whereValues[i] === "string" ? `"${whereValues[i]}"` : whereValues[i]}`
        }
        if (force) {
            await this.connection.query(
                `DELETE FROM ${this.table} WHERE true ${where}`
            )
        }
        else {
            await this.connection.query(
                `UPDATE ${this.table} SET deleted_at="0000-00-00 00:00:00" WHERE deleted_at IS NULL ${where}`
            )
        }

        /*
            Model.destroy({
                where: {                                                      
                    is_admin: true                                            
                },
                force: true      // will cause hard delete
            })
        */

        /*
           Model.destroy({
               where: {                                                      
                   id: 10                                           
               },
               force: false      // will cause soft delete
           })
       */
        /*
           Model.destroy({
               where: {                                                      
                   id: 10                                           
               },  // will cause soft delete
           })
       */

    }

    async restore(options) {
        let where = "";
        if (options) {
            const whereKeys = options.where ? Object.keys(options.where) : [];
            const whereValues = options.where ? Object.values(options.where) : [];
            for (let i = 0; i < whereKeys.length; i++) {
                where += `AND ${whereKeys[i]} = ${typeof whereValues[i] === "string" ? `"${whereValues[i]}"` : whereValues[i]}`
            }
        }
        await this.connection.query(
            `UPDATE ${this.table} SET deleted_at=null WHERE deleted_at IS NOT NULL ${where}`
        )
        /*
           Model.restore({
               where: {                                                      
                   id: 12                                          
               }
           })
       */
    }

}

module.exports = { MySequelize };