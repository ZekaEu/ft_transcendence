#include <unistd.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/socket.h>
#include <sys/select.h>
#include <netinet/in.h>

typedef struct s_client {
	int id;
	char msg[300000];
}	t_client;

t_client clients[1024];
int maxfd = 0, globalid = 0;
char sendbuff[400000], recvbuff[300000];
fd_set writefds, readfds, currfds;

void err(char *msg) {
	if(msg)
		write(2, msg, strlen(msg));
	else
		write(2, "Fatal error", 11);
	write(2, "\n", 1);
	exit(1);
}

void broadcast(int e) {
	for(int fd = 0; fd <= maxfd; fd++)
		if(FD_ISSET(fd, &writefds) && fd != e)
			if(send(fd, sendbuff, strlen(sendbuff), 0) < 0)
				err(NULL);
}

int main(int argc, char **argv) {
	if(argc != 2)
		err("Wrong number of arguments");

	struct sockaddr_in server;
	int serverfd = socket(AF_INET, SOCK_STREAM, 0);
	if(serverfd < 0)
		err(NULL);
	maxfd = serverfd;

	FD_ZERO(&currfds);
	FD_SET(serverfd, &currfds);
	memset(&clients, 0, sizeof(clients));
	memset(&server, 0, sizeof(server));

	server.sin_port = htons(atoi(argv[1]));
	server.sin_family = AF_INET;
	server.sin_addr.s_addr = htonl(INADDR_ANY);

	if(bind(serverfd, (const struct sockaddr *)&server, sizeof(server)) < 0) {
        close(serverfd);
        err(NULL);
    }
    if(listen(serverfd, 100) < 0) {
        close(serverfd);
        err(NULL);    
    }

	while(1) {
		writefds = readfds = currfds;
		if(select(maxfd + 1, &readfds, &writefds, NULL, NULL) < 0)
            continue;

		for(int fd = 0; fd <= maxfd; fd++) {
			if(FD_ISSET(fd, &readfds)) {
				if(fd == serverfd) {
                    socklen_t len = sizeof(server);
					int clientfd = accept(fd, (struct sockaddr *)&server, &len);
					if(clientfd < 0)
                        continue;
					if(clientfd > maxfd)
                        maxfd = clientfd;
                    FD_SET(clientfd, &currfds);
					clients[clientfd].id = globalid++;
					sprintf(sendbuff, "server: client %d just arrived\n", clients[clientfd].id);
					broadcast(clientfd);
                    bzero(sendbuff, strlen(sendbuff));
					break;
				} else {
					ssize_t bufflen = recv(fd, recvbuff, sizeof(recvbuff), 0);
					if(bufflen <= 0) {
						bzero(&sendbuff, strlen(sendbuff));
						sprintf(sendbuff, "server: client %d just left\n", clients[fd].id);					
						broadcast(fd);
						FD_CLR(fd, &currfds);
						close(fd);
                        bzero(&clients[fd].msg, strlen(clients[fd].msg));
						break;
					} else {
						recvbuff[bufflen] = '\0';
						for(int i = 0, j = strlen(clients[fd].msg); i < bufflen; i++, j++) {
							clients[fd].msg[j] = recvbuff[i];
							if(clients[fd].msg[j] == '\n') {
								clients[fd].msg[j] = '\0';
								sprintf(sendbuff, "client %d: %s\n", clients[fd].id, clients[fd].msg);
								broadcast(fd);
								bzero(clients[fd].msg, strlen(clients[fd].msg));
								j = -1;
							}
						}
					}
				}
			}
		}
	}
	return (0);
}