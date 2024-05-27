import React, { useState, useEffect } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import { useTable, usePagination } from 'react-table';

const socket = io('http://localhost:5000');
const FileUpload = () => {
    const [file, setFile] = useState(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadStatus, setUploadStatus] = useState('');
    const [data, setData] = useState([]);
    const [pageCount, setPageCount] = useState(0);
    const [currentPage, setCurrentPage] = useState(0);

    useEffect(() => {
        socket.on('progress', (data) => {
            setUploadProgress(data.progress);
        });
        return () => {
            socket.off('progress');
        };
    }, []);
    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
    };
    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file) return;
        const formData = new FormData();
        formData.append('file', file);
        try {
            const response = await axios.post('http://localhost:5000/upload', formData, {
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    setUploadProgress(percentCompleted);
                },
            });
            setUploadStatus('Upload successful!');
            fetchPageData(0); // Fetch first page of data
        } catch (error) {
            setUploadStatus('Upload failed!');
        }
    };
    const fetchPageData = async (pageIndex) => {
        const response = await axios.get(`http://localhost:5000/data?page=${pageIndex}`);
        setData(response.data.rows);
        setPageCount(response.data.pageCount);
        setCurrentPage(pageIndex);
    };
    const columns = React.useMemo(
        () => [
            { Header: 'Column 1', accessor: 'column1' },
            { Header: 'Column 2', accessor: 'column2' },
            { Header: 'Column 3', accessor: 'column3' }
        ],
        []
    );
    const {
        getTableProps,
        getTableBodyProps,
        headerGroups,
        prepareRow,
        page,
        canPreviousPage,
        canNextPage,
        pageOptions,
        gotoPage,
        nextPage,
        previousPage,
        setPageSize,
        state: { pageIndex, pageSize },
    } = useTable(
        {
            columns,
            data,
            initialState: { pageIndex: 0 },
            manualPagination: true,
            pageCount,
        },
        usePagination
    )
    console.log(getTableProps);
    return (
        <div>
            <h1>Upload CSV File</h1>
            <form onSubmit={handleUpload}>
                <input type="file" onChange={handleFileChange} accept=".csv" />
                <button type="submit">Upload</button>
            </form>
            {uploadProgress > 0 && (
                <div>
                    <progress value={uploadProgress} max="100"></progress>
                    <span>{uploadProgress}%</span>
                </div>
            )}
            <div>{uploadStatus}</div>
            {data.length > 0 && (
                <div>
                    <table {...getTableProps()}>
                        <thead>
                            {headerGroups.map((headerGroup) => (
                                <tr {...headerGroup.getHeaderGroupProps()}>
                                    {headerGroup.headers.map((column) => (
                                        <th {...column.getHeaderProps()}>{column.render('Header')}</th>
                                    ))}
                                </tr>
                            ))}
                        </thead>
                        <tbody {...getTableBodyProps()}>
                            {page.map((row) => {
                                prepareRow(row);
                                return (
                                    <tr {...row.getRowProps()}>
                                        {row.cells.map((cell) => (
                                            <td {...cell.getCellProps()}>{cell.render('Cell')}</td>
                                        ))}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    <div>
                        <button onClick={() => gotoPage(0)} disabled={!canPreviousPage}>
                            {'<<'}
                        </button>{' '}
                        <button onClick={() => previousPage()} disabled={!canPreviousPage}>
                            {'<'}
                        </button>{' '}
                        <button onClick={() => nextPage()} disabled={!canNextPage}>
                            {'>'}
                        </button>{' '}
                        <button onClick={() => gotoPage(pageCount - 1)} disabled={!canNextPage}>
                            {'>>'}
                        </button>{' '}
                        <span>
                            Page{' '}
                            <strong>
                                {pageIndex + 1} of {pageOptions.length}
                            </strong>{' '}
                        </span>
                        <span>
                            | Go to page:{' '}
                            <input
                                type="number"
                                defaultValue={pageIndex + 1}
                                onChange={(e) => {
                                    const page = e.target.value ? Number(e.target.value) - 1 : 0;
                                    gotoPage(page);
                                }}
                                style={{ width: '100px' }}
                            />
                        </span>{' '}
                        <select
                            value={pageSize}
                            onChange={(e) => {
                                setPageSize(Number(e.target.value));
                            }}
                        >
                            {[10, 20, 30, 40, 50].map((pageSize) => (
                                <option key={pageSize} value={pageSize}>
                                    Show {pageSize}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            )}
        </div>
    );
};
export default FileUpload;
