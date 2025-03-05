import React, {useState} from 'react';
import '../styles/Card.css';


const Card = (props) => {

    let stringValueArray = props.data?.value
    ? JSON.stringify(props.data.value, (key, value) => 
        typeof value === 'bigint' ? value.toString() : value
    ).slice(1,-1).replace(/"/g,' ').split(",")
    : [];
    return (
        <div className='Card'>
            <div className='contract-section'>
                <div className='cAddress'><b>Contract address : </b>{props.data['contract-address']}</div>
                <div><b>Contract name : </b>{props.data['contract-name']}</div>
                <div><b>Contract symbol : </b>{props.data['contract-symbol']}</div>
            </div>
            <div className='Values-section'>
                <div><b>Data</b></div>
                <div>
                {stringValueArray.map((ele, i) => 
                    <div key={i} className="value-div">{ele}</div>
                )}
                </div>
            </div>
        </div>
    )
};

export default Card