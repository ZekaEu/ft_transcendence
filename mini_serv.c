#include <stdio.h>
#include <unistd.h>
#include <stdlib.h>
#include <string.h>
#include <netinet/in.h>
#include <sys/select.h>

// GLOBAL VARIABLES - using socket IDs as array indices
// serverSocket: the listening socket
// maxSockets: tracks the highest FD number in use (needed for select())
// next_id: increments to give each client a unique ID
int serverSocket = -1, maxSockets = 0, next_id = 0;

// clients[]: maps socket FD to client ID (clients[3] = 5 means FD 3 is client #5)
// currentMessage[]: tracks if we're in the middle of a multi-part message
//   0 = start of new message (needs client prefix)
//   1 = continuation of previous message (no prefix)
int clients[65536], currentMessage[65536];

// BUFFERS - shared buffers reused each iteration
// bufferRead: receives data from clients
// bufferWrite: holds the formatted message to broadcast
// bufferWriteMessage: temporary buffer for processing partial messages
char bufferRead[4096 * 42], bufferWrite[4096 * 42 + 42], bufferWriteMessage[4096 * 42];

// FILE DESCRIPTOR SETS
// activeSockets: all currently active sockets (server + all clients)
// readSockets: copy of activeSockets, select() fills with readable sockets
// writeSockets: copy of activeSockets, select() fills with writable sockets
fd_set readSockets, writeSockets, activeSockets;

// FUNCTION: sendMessage
// Broadcasts a message to all connected clients EXCEPT the sender
// Only sends to clients that appear in writeSockets (ready to write)
// This prevents send buffer overflow by checking write readiness first
void sendMessage(int sender)
{
	for (int i = 0; i <= maxSockets; i++)
		if (FD_ISSET(i, &writeSockets) && i != sender)
			send(i, bufferWrite, strlen(bufferWrite), 0);
}

void fatal(void)
{
	write(2, "Fatal error\n", strlen("Fatal error\n"));
	close(serverSocket);
	exit(1);
}

int main(int argc, char **argv)
{
	// STEP 1: ARGUMENT VALIDATION
	if (argc != 2)
	{
		write(2, "Wrong number of arguments\n", strlen("Wrong number of arguments\n"));
		exit(1);
	}

	// STEP 2: CREATE AND BIND SERVER SOCKET
	serverSocket = socket(AF_INET, SOCK_STREAM, 0);
	struct sockaddr_in serverAddr;
	socklen_t len;

	serverAddr.sin_family = AF_INET;
	serverAddr.sin_addr.s_addr = htonl(2130706433);  // 127.0.0.1 in network byte order
	serverAddr.sin_port = htons(atoi(argv[1]));

	if (serverSocket < 0)
		fatal();
	if ((bind(serverSocket, (const struct sockaddr *) &serverAddr, sizeof(serverAddr))) < 0)
		fatal();
	if (listen(serverSocket, 128) < 0)
		fatal();

	// STEP 3: INITIALIZE FILE DESCRIPTOR SETS
	// Start with just the server socket in the active set
	FD_ZERO(&activeSockets);
	FD_SET(serverSocket, &activeSockets);
	maxSockets = serverSocket;  // maxSockets = highest FD number we're monitoring
	bzero(clients, sizeof(clients));  // Clear the clients array
	bzero(currentMessage, sizeof(currentMessage));

	// MAIN EVENT LOOP
	while (1)
	{
		// STEP 4: COPY ACTIVE SOCKETS TO READ/WRITE SETS
		// We copy because select() modifies the fd_sets
		// readSockets = which sockets have data to read
		// writeSockets = which sockets are ready to send data
		readSockets = writeSockets = activeSockets;

		// STEP 5: CALL SELECT - WAIT FOR EVENTS
		// select() blocks until at least one socket is ready, or returns error
		// Returns: number of ready sockets, 0 if timeout, -1 if error
		if (select(maxSockets + 1, &readSockets, &writeSockets, NULL, NULL) <= 0)
			continue;

		// STEP 6: PROCESS ALL SOCKETS (0 to maxSockets)
		for(int socketId = 0; socketId <= maxSockets; socketId++)
		{
			// Check if this socket has data to read
			if (FD_ISSET(socketId, &readSockets))
			{
				// CASE A: IT'S THE SERVER SOCKET - NEW CONNECTION INCOMING
				if (serverSocket == socketId)
				{
					int clientSocket = accept(serverSocket, (struct sockaddr *) &serverAddr, &len);
					if (clientSocket < 0)
						continue;
					
					// Add new client to active set
					FD_SET(clientSocket, &activeSockets);
					clients[clientSocket] = next_id++;  // Store client ID indexed by socket FD
					currentMessage[clientSocket] = 0;  // Fresh client, starting new message
					maxSockets = maxSockets < clientSocket ? clientSocket : maxSockets;
					
					// Broadcast arrival message
					sprintf(bufferWrite, "server: client %d just arrived\n", clientSocket);
					sendMessage(clientSocket);  // Send to all EXCEPT the new client
					break;
				}
				// CASE B: IT'S A CLIENT SOCKET - CLIENT DATA INCOMING
				else
				{
					int bytesRead = recv(socketId, bufferRead, 4096 * 42, 0);
					
					// CLIENT DISCONNECTED (recv returned 0 or -1)
					if (bytesRead <= 0)
					{
						sprintf(bufferWrite, "server: client %d just left\n", clients[socketId]);
						sendMessage(socketId);
						close(socketId);
						FD_CLR(socketId, &activeSockets);  // Remove from active set
						break;
					}
					// CLIENT SENT DATA - PROCESS IT
					else
					{
						// STEP 7: PARSE MESSAGE DATA
						// Process byte-by-byte to handle newlines properly
						// When we find a newline: send complete message
						// If message ends without newline: mark as partial (currentMessage[socketId] = 1)
						for(int i = 0, j = 0; i < bytesRead; i++, j++)
						{
							bufferWriteMessage[j] = bufferRead[i];
							
							// FOUND A NEWLINE - COMPLETE MESSAGE
							if (bufferWriteMessage[j] == '\n')
							{
								bufferWriteMessage[j + 1] = '\0';
								
								// If currentMessage[socketId] == 1: this is a continuation (no prefix)
								// If currentMessage[socketId] == 0: this is the start (add prefix)
								if (currentMessage[socketId])
									sprintf(bufferWrite, "%s", bufferWriteMessage);
								else
									sprintf(bufferWrite, "client %d: %s", clients[socketId], bufferWriteMessage);
								
								currentMessage[socketId] = 0;  // Next message will be a fresh start
								j = -1;  // Reset j for next line
								sendMessage(socketId);
							}
							// REACHED END OF BUFFER WITHOUT NEWLINE - PARTIAL MESSAGE
							else if (i == (bytesRead - 1))
							{
								bufferWriteMessage[j + 1] = '\0';
								
								if (currentMessage[socketId])
									sprintf(bufferWrite, "%s", bufferWriteMessage);
								else
									sprintf(bufferWrite, "client %d: %s", clients[socketId], bufferWriteMessage);
								
								currentMessage[socketId] = 1;  // Mark as partial - next data is continuation
								sendMessage(socketId);
								break;
							}
						}
					}
				}
			}
		}
	}
}